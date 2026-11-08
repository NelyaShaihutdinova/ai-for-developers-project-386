import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Card,
  Container,
  Flex,
  Grid,
  Group,
  Loader,
  Paper,
  Text,
  Title,
} from '@mantine/core'

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

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function getWeekdays(): Date[] {
  const dates: Date[] = []
  const today = new Date()
  let date = new Date(today)
  date.setDate(date.getDate() + 1) // start from tomorrow

  while (dates.length < 14) {
    const day = date.getDay()
    if (day !== 0 && day !== 6) {
      // skip weekends
      dates.push(new Date(date))
    }
    date.setDate(date.getDate() + 1)
  }
  return dates
}

function MeetingsPage() {
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([])
  const [selectedType, setSelectedType] = useState<MeetingType | null>(null)
  const [dates] = useState<Date[]>(() => getWeekdays())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  useEffect(() => {
    fetch('http://localhost:3000/api/meeting-types')
      .then((res) => res.json())
      .then((data) => setMeetingTypes(data))
  }, [])

  const loadSlots = useCallback(async (date: Date, meetingTypeId: number) => {
    setLoadingSlots(true)
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
    if (selectedType) {
      loadSlots(date, selectedType.id)
    }
  }

  if (!selectedType) {
    return (
      <Container size="md" py="xl">
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
        <Button
          variant="subtle"
          onClick={() => {
            setSelectedType(null)
            setSelectedDate(null)
            setSlots([])
          }}
        >
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
          <Flex gap="xs" wrap="wrap">
            {slots.map((slot, idx) => (
              <Paper key={idx} withBorder p="xs" radius="md">
                <Text size="sm">
                  {formatTime(slot.startAt)}–{formatTime(slot.endAt)}
                </Text>
              </Paper>
            ))}
          </Flex>
        </>
      ) : selectedDate ? (
        <Text c="dimmed">Нет доступных слотов</Text>
      ) : null}
    </Container>
  )
}

export default MeetingsPage
