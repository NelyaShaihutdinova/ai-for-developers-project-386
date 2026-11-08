import { useEffect, useRef, useState } from 'react'
import {
  ActionIcon,
  Button,
  Container,
  Group,
  Modal,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { IconPencil, IconTrash } from '@tabler/icons-react'

interface MeetingType {
  id: number
  name: string
  description: string
  durationMinutes: number
  isActive: boolean
  createdAt: string
}

const API_BASE = 'http://localhost:3000/api/meeting-types'

function DashboardPage() {
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([])
  const [modalOpened, setModalOpened] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const isMounted = useRef(true)

  const form = useForm({
    initialValues: { name: '', description: '', durationMinutes: 30 },
    validate: {
      name: (value) => (value.length > 0 ? null : 'Name is required'),
      durationMinutes: (value) =>
        value > 0 && value % 15 === 0 ? null : 'Must be a positive multiple of 15',
    },
  })

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      const res = await fetch(API_BASE)
      const data = await res.json()
      if (isMounted.current) {
        setMeetingTypes(data)
      }
    }
    load()
  }, [])

  const handleSubmit = async (values: typeof form.values) => {
    const method = editingId ? 'PATCH' : 'POST'
    const url = editingId ? `${API_BASE}/${editingId}` : API_BASE

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })

    form.reset()
    setEditingId(null)
    setModalOpened(false)

    const res = await fetch(API_BASE)
    const data = await res.json()
    setMeetingTypes(data)
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
    await fetch(`${API_BASE}/${id}/deactivate`, { method: 'POST' })
    const res = await fetch(API_BASE)
    const data = await res.json()
    setMeetingTypes(data)
  }

  const rows = meetingTypes.map((mt) => (
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
    <Container size="lg" py="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>Управление типами встреч</Title>
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

      <Table striped>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Название</Table.Th>
            <Table.Th>Длительность</Table.Th>
            <Table.Th>Описание</Table.Th>
            <Table.Th>Действия</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.length > 0 ? (
            rows
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
