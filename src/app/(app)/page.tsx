import { Flex, Heading, Text } from '@/components/ui'

export default function Home() {
  return (
    <div className="app-scroll">
      <div className="page-padding">
        <Flex direction="column" gap="3" pt="4">
          <Heading size="6">Dashboard</Heading>
          <Text color="gray">Welcome to the app.</Text>
        </Flex>
      </div>
    </div>
  )
}
