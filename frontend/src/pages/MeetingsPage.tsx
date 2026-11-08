import { useEffect, useState } from 'react'
import { Card, Container, Grid, Loader, Text, Title } from '@mantine/core'

interface MeetingType {
  id: number
  name: string
  description: string
  durationMinutes: number
  isActive: boolean
  createdAt: string
}

function MeetingsPage() {
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('http://localhost:3000/api/meeting-types')
      .then((res) => res.json())
      .then((data) => {
        setMeetingTypes(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Container size="md" py="xl" style={{ display: 'flex', justifyContent: 'center' }}>
        <Loader />
      </Container>
    )
  }

  return (
    <Container size="md" py="xl">
      <Title order={1} ta="center" mb="xl">
        Каталог типов встреч
      </Title>

      {meetingTypes.length === 0 ? (
        <Text ta="center" c="dimmed">
          Пока нет доступных типов встреч
        </Text>
      ) : (
        <Grid>
          {meetingTypes.map((mt) => (
            <Grid.Col key={mt.id} span={{ base: 12, sm: 6, md: 4 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
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

export default MeetingsPage
