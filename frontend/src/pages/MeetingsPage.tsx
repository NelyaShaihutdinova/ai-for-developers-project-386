import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Container,
  Flex,
  Grid,
  Group,
  Loader,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { IconAlertCircle, IconCheck } from '@tabler/icons-react'

interface MeetingType {
  id: number
  name: string
  description: string
  durationMinutes: number
  isActive: boolean
  createdAt: string
}

interface Slot {
  startAt: string
  endAt: string
}

function formatTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Moscow',
  })
}

function formatDateFull(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Moscow',
  })
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function getWeekdays(): Date[] {
  const dates: Date[] = []
  const today = new Date()
  let date = new Date(today)
  date.setDate(date.getDate() + 1)

  while (dates.length < 14) {
    const day = date.getDay()
    if (day !== 0 && day !== 6) {
      dates.push(new Date(date))
    }
    date.setDate(date.getDate() + 1)
  }
  return dates
}

import { Link } from 'react-router-dom'

function MeetingsPage() {
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([])
  const [selectedType, setSelectedType] = useState<MeetingType | null>(null)
  const [dates] = useState<Date[]>(() => getWeekdays())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [booking, setBooking] = useState(false)
  const [conflictError, setConflictError] = useState('')
  const [confirmedBooking, setConfirmedBooking] = useState<{
    startAt: string
    endAt: string
    guestName: string
    guestEmail: string
  } | null>(null)

  const form = useForm({
    initialValues: { guestName: '', guestEmail: '' },
    validate: {
      guestName: (v) => (v.length > 0 ? null : 'Имя обязательно'),
      guestEmail: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : 'Неверный email'),
    },
  })

  useEffect(() => {
    fetch('http://localhost:3000/api/meeting-types')
      .then((res) => res.json())
      .then((data) => setMeetingTypes(data))
  }, [])

  const loadSlots = useCallback(async (date: Date, meetingTypeId: number) => {
    setLoadingSlots(true)
    setConflictError('')
    try {
      const dateStr = formatDate(date)
      const res = await fetch(
        `http://localhost:3000/api/slots?meetingTypeId=${meetingTypeId}&date=${dateStr}`,
      )
      const data = await res.json()
      setSlots(data)
    } finally {
      setLoadingSlots(false)
    }
  }, [])

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    setSelectedSlot(null)
    setConfirmedBooking(null)
    if (selectedType) {
      loadSlots(date, selectedType.id)
    }
  }

  const handleBooking = async (values: typeof form.values) => {
    if (!selectedSlot || !selectedType) return
    setBooking(true)
    setConflictError('')

    try {
      const res = await fetch('http://localhost:3000/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingTypeId: selectedType.id,
          startAt: selectedSlot.startAt,
          guestName: values.guestName,
          guestEmail: values.guestEmail,
        }),
      })

      if (res.status === 409) {
        const errorData = await res.json()
        setConflictError(errorData?.error?.message || 'Этот слот уже занят. Выберите другой.')
        setSelectedSlot(null)
        if (selectedDate && selectedType) {
          await loadSlots(selectedDate, selectedType.id)
        }
        setBooking(false)
        return
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => null)
        setConflictError(
          errorData?.error?.message || 'Произошла ошибка при бронировании. Попробуйте ещё раз.',
        )
        setBooking(false)
        return
      }

      const data = await res.json()
      setConfirmedBooking({
        startAt: data.startAt,
        endAt: data.endAt,
        guestName: data.guestName,
        guestEmail: data.guestEmail,
      })
    } catch {
      setConflictError('Ошибка сети. Проверьте подключение и попробуйте ещё раз.')
      setBooking(false)
    }
  }

  const resetToStart = () => {
    setSelectedType(null)
    setSelectedDate(null)
    setSelectedSlot(null)
    setSlots([])
    setConfirmedBooking(null)
    setConflictError('')
    form.reset()
  }

  if (confirmedBooking) {
    return (
      <Container size="md" py="xl">
        <Flex direction="column" align="center" gap="lg">
          <IconCheck size={48} color="green" />
          <Title order={1}>Записано!</Title>
          <Card shadow="sm" padding="lg" withBorder style={{ width: '100%', maxWidth: 400 }}>
            <Text fw={500} mb="xs">
              {selectedType?.name}
            </Text>
            <Text size="sm" mb="xs">
              {formatDateFull(confirmedBooking.startAt)}
            </Text>
            <Text size="sm" mb="xs">
              {formatTime(confirmedBooking.startAt)}–{formatTime(confirmedBooking.endAt)}
            </Text>
            <Text size="sm" mb="xs">
              Имя: {confirmedBooking.guestName}
            </Text>
            <Text size="sm">Email: {confirmedBooking.guestEmail}</Text>
          </Card>
          <Button onClick={resetToStart} size="lg" mt="md">
            Записаться ещё
          </Button>
        </Flex>
      </Container>
    )
  }

  if (!selectedType) {
    return (
      <Container size="md" py="xl">
        <Group mb="xl">
          <Button component={Link} to="/" variant="subtle">
            ← На главную
          </Button>
        </Group>
        <Title order={1} ta="center" mb="xl">
          Выберите тип встречи
        </Title>

        {meetingTypes.length === 0 ? (
          <Text ta="center" c="dimmed">
            Пока нет доступных типов встреч
          </Text>
        ) : (
          <Grid>
            {meetingTypes.map((mt) => (
              <Grid.Col key={mt.id} span={{ base: 12, sm: 6, md: 4 }}>
                <Card
                  shadow="sm"
                  padding="lg"
                  radius="md"
                  withBorder
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedType(mt)}
                >
                  <Card.Section withBorder inheritPadding py="xs">
                    <Text fw={500} size="lg">
                      {mt.name}
                    </Text>
                  </Card.Section>
                  <Card.Section padding="sm">
                    <Text size="sm" c="dimmed">
                      {mt.description}
                    </Text>
                    <Text size="sm" mt="xs">
                      Длительность: {mt.durationMinutes} мин
                    </Text>
                  </Card.Section>
                </Card>
              </Grid.Col>
            ))}
          </Grid>
        )}
      </Container>
    )
  }

  return (
    <Container size="md" py="xl">
      <Group mb="xl">
        <Button variant="subtle" onClick={resetToStart}>
          ← Назад к типам
        </Button>
        <Title order={2}>
          {selectedType.name} ({selectedType.durationMinutes} мин)
        </Title>
      </Group>

      <Text mb="md" fw={500}>
        Выберите дату:
      </Text>
      <Flex gap="xs" wrap="wrap" mb="xl">
        {dates.map((date, idx) => {
          const isSelected = selectedDate && formatDate(selectedDate) === formatDate(date)
          return (
            <Button
              key={idx}
              variant={isSelected ? 'filled' : 'outline'}
              onClick={() => handleDateSelect(date)}
            >
              {date.toLocaleDateString('ru-RU', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}
            </Button>
          )
        })}
      </Flex>

      {loadingSlots ? (
        <Flex justify="center">
          <Loader />
        </Flex>
      ) : slots.length > 0 ? (
        <>
          <Text mb="md" fw={500}>
            Доступные слоты:
          </Text>
          <Flex gap="xs" wrap="wrap" mb="xl">
            {slots.map((slot, idx) => {
              const isSelected =
                selectedSlot &&
                selectedSlot.startAt === slot.startAt &&
                selectedSlot.endAt === slot.endAt
              return (
                <Button
                  key={idx}
                  variant={isSelected ? 'filled' : 'outline'}
                  onClick={() => {
                    setSelectedSlot(slot)
                    setConflictError('')
                  }}
                  size="sm"
                >
                  {formatTime(slot.startAt)}–{formatTime(slot.endAt)}
                </Button>
              )
            })}
          </Flex>
        </>
      ) : selectedDate ? (
        <Text c="dimmed">Нет доступных слотов</Text>
      ) : null}

      {conflictError && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mb="lg">
          {conflictError}
        </Alert>
      )}

      {selectedSlot && (
        <form onSubmit={form.onSubmit(handleBooking)}>
          <Text mb="md" fw={500}>
            Заполните данные:
          </Text>
          <TextInput
            label="Имя"
            placeholder="Ваше имя"
            mb="sm"
            {...form.getInputProps('guestName')}
          />
          <TextInput
            label="Email"
            placeholder="email@example.com"
            mb="md"
            {...form.getInputProps('guestEmail')}
          />
          <Button type="submit" fullWidth size="lg" loading={booking}>
            Записаться
          </Button>
        </form>
      )}
    </Container>
  )
}

export default MeetingsPage
