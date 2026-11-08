import { Box, Button, Container, Flex, List, Text, Title } from '@mantine/core'
import { Link } from 'react-router-dom'
import { OWNER_NAME } from '../config'

const steps = ['Выберите тип встречи', 'Откройте календарь', 'Забронируйте слот']

function HomePage() {
  return (
    <Flex direction="column" mih="100vh">
      <Box py="xs" px="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
        <Text size="lg" fw={600}>
          {OWNER_NAME}
        </Text>
      </Box>

      <Container size="md" py="xl" style={{ flex: 1 }}>
        <Title order={1} ta="center" mb="md">
          Запись на звонок к {OWNER_NAME}
        </Title>

        <Title order={3} ta="center" mb="xl" fw={400} c="dimmed">
          Как записаться
        </Title>

        <List ta="center" mb="xl">
          {steps.map((step, index) => (
            <List.Item key={index}>{step}</List.Item>
          ))}
        </List>

        <Box ta="center">
          <Button component={Link} to="/meetings" size="lg">
            Выбрать тип встречи
          </Button>
        </Box>
      </Container>

      <Box py="md" ta="center" style={{ borderTop: '1px solid var(--mantine-color-gray-3)' }}>
        <Text size="sm" c="dimmed">
          © 2026 Запись на звонок
        </Text>
      </Box>
    </Flex>
  )
}

export default HomePage
