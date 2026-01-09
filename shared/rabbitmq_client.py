import aio_pika
import json
from typing import Callable
from config import settings


class RabbitMQClient:
    def __init__(self):
        self.connection = None
        self.channel = None
        self.exchange = None

    async def connect(self):
        self.connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
        self.channel = await self.connection.channel()

        self.exchange = await self.channel.declare_exchange(
            "pos_events", aio_pika.ExchangeType.TOPIC, durable=True
        )

        print("✅ RabbitMQ connected")

    async def close(self):
        if self.connection:
            await self.connection.close()
            print("👋 RabbitMQ disconnected")

    async def publish(self, routing_key: str, message: dict):
        if not self.exchange:
            raise Exception("RabbitMQ not connected")

        await self.exchange.publish(
            aio_pika.Message(
                body=json.dumps(message).encode(),
                content_type="application/json",
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
            ),
            routing_key=routing_key,
        )
        print(f"📤 Published: {routing_key} -> {message}")

    async def subscribe(self, routing_key: str, callback: Callable):
        if not self.channel:
            raise Exception("RabbitMQ not connected")

        # Create unique queue name without special characters
        queue_name = (
            routing_key.replace(".", "_").replace("*", "all").replace("#", "any")
        )
        queue_name = f"queue_{queue_name}"

        queue = await self.channel.declare_queue(queue_name, durable=True)

        # Bind with routing key pattern
        await queue.bind(self.exchange, routing_key=routing_key)

        async def wrapper(message: aio_pika.IncomingMessage):
            async with message.process():
                try:
                    data = json.loads(message.body.decode())
                    print(f"📥 Received: {routing_key} -> {data}")
                    await callback(data)
                except Exception as e:
                    print(f"❌ Error processing message: {e}")

        await queue.consume(wrapper)
        print(f"🔔 Subscribed to: {routing_key} (queue: {queue_name})")


rabbitmq_client = RabbitMQClient()
