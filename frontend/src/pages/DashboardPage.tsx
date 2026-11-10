import { useEffect, useRef, useState } from 'react'
import {
  ActionIcon,
  Button,
  Container,
  Group,
  Modal,
  Select,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { IconPencil, IconTrash } from '@tabler/icons-react'
import {
  apiClient,
  meetingTypesCreate,
  meetingTypesDeactivate,
  meetingTypesList,
  meetingTypesUpdate,
  bookingsList,
  type MeetingType,
  type BookingWithTypeName,
} from '../api'

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Moscow',
  })
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Moscow',
  })
}

function DashboardPage() {
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([])
  const [bookings, setBookings] = useState<BookingWithTypeName[]>([])
  const [modalOpened, setModalOpened] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [filterType, setFilterType] = useState<string | null>(null)

  const form = useForm({
    initialValues: { name: '', description: '', durationMinutes: 30 },
    validate: {
      name: (v) => (v.length > 0 ? null : 'Name is required'),
      durationMinutes: (v) => (v > 0 && v % 15 === 0 ? null : 'Must be a positive multiple of 15'),
    },
  })

  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      const [mtRes, bkRes] = await Promise.all([
        meetingTypesList({ client: apiClient }),
        bookingsList({ client: apiClient }),
      ])
      if (isMounted.current) {
        setMeetingTypes(mtRes.data || [])
        setBookings(bkRes.data || [])
      }
    }
    load()
  }, [])

  const loadMeetingTypes = async () => {
    const res = await meetingTypesList({ client: apiClient })
    setMeetingTypes(res.data || [])
  }

  const handleSubmit = async (values: typeof form.values) => {
    const body = { ...values, durationMinutes: Number(values.durationMinutes) }
    if (editingId) {
      await meetingTypesUpdate({
        client: apiClient,
        path: { id: editingId },
        body,
      })
    } else {
      await meetingTypesCreate({
        client: apiClient,
        body,
      })
    }

    form.reset()
    setEditingId(null)
    setModalOpened(false)
    loadMeetingTypes()
  }

  const handleEdit = (mt: MeetingType) => {
    form.setValues({
      name: mt.name,
      description: mt.description,
      durationMinutes: mt.durationMinutes,
    })
    setEditingId(mt.id)
    setModalOpened(true)
  }

  const handleDeactivate = async (id: number) => {
    await meetingTypesDeactivate({ client: apiClient, path: { id } })
    loadMeetingTypes()
  }

  const filteredBookings = bookings.filter((b) => {
    if (filterType && b.meetingTypeId !== Number(filterType)) return false
    return true
  })

  const bookingRows = filteredBookings.map((b) => (
    <Table.Tr key={b.id}>
      <Table.Td>{formatDate(b.startAt)}</Table.Td>
      <Table.Td>
        {formatTime(b.startAt)}–{formatTime(b.endAt)}
      </Table.Td>
      <Table.Td>{b.meetingTypeName}</Table.Td>
      <Table.Td>{b.guestName}</Table.Td>
      <Table.Td>{b.guestEmail}</Table.Td>
      <Table.Td>
        {b.endAt
          ? Math.round((new Date(b.endAt).getTime() - new Date(b.startAt).getTime()) / 60000)
          : ''}{' '}
        мин
      </Table.Td>
    </Table.Tr>
  ))

  const typeRows = meetingTypes.map((mt) => (
    <Table.Tr key={mt.id}>
      <Table.Td>{mt.name}</Table.Td>
      <Table.Td>{mt.durationMinutes} min</Table.Td>
      <Table.Td>{mt.description}</Table.Td>
      <Table.Td>
        <Group gap="xs">
          <ActionIcon variant="subtle" onClick={() => handleEdit(mt)}>
            <IconPencil size={16} />
          </ActionIcon>
          <ActionIcon variant="subtle" color="red" onClick={() => handleDeactivate(mt.id)}>
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  ))

  return (
    <Container size="xl" py="xl">
      <Title order={1} mb="xl">
        Панель владельца
      </Title>

      <Title order={2} mb="md">
        Типы встреч
      </Title>
      <Group justify="space-between" mb="xl">
        <Text c="dimmed">Управление типами встреч</Text>
        <Button
          onClick={() => {
            form.reset()
            setEditingId(null)
            setModalOpened(true)
          }}
        >
          Добавить тип
        </Button>
      </Group>

      <Table striped mb="xl">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Название</Table.Th>
            <Table.Th>Длительность</Table.Th>
            <Table.Th>Описание</Table.Th>
            <Table.Th>Действия</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {typeRows.length > 0 ? (
            typeRows
          ) : (
            <Table.Tr>
              <Table.Td colSpan={4}>
                <Text ta="center" c="dimmed">
                  Пока нет типов встреч
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>

      <Title order={2} mb="md">
        Предстоящие встречи
      </Title>

      <Group mb="md">
        <Select
          label="Тип встречи"
          placeholder="Все"
          clearable
          value={filterType}
          onChange={(value) => setFilterType(value?.toString() ?? null)}
          data={meetingTypes.map((mt) => ({ value: String(mt.id), label: mt.name }))}
          style={{ maxWidth: 250 }}
        />
      </Group>

      <Table striped>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Дата</Table.Th>
            <Table.Th>Время</Table.Th>
            <Table.Th>Тип</Table.Th>
            <Table.Th>Имя гостя</Table.Th>
            <Table.Th>Email</Table.Th>
            <Table.Th>Длительность</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {bookingRows.length > 0 ? (
            bookingRows
          ) : (
            <Table.Tr>
              <Table.Td colSpan={6}>
                <Text ta="center" c="dimmed">
                  Пока нет записей
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>

      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={editingId ? 'Редактировать тип' : 'Новый тип встречи'}
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput label="Название" {...form.getInputProps('name')} mb="sm" />
          <TextInput label="Описание" {...form.getInputProps('description')} mb="sm" />
          <TextInput
            label="Длительность (мин)"
            type="number"
            {...form.getInputProps('durationMinutes')}
            mb="sm"
          />
          <Button type="submit" fullWidth>
            {editingId ? 'Сохранить' : 'Создать'}
          </Button>
        </form>
      </Modal>
    </Container>
  )
}

export default DashboardPage
