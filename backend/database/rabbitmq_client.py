import asyncio
import json
from typing import Callable

import aio_pika
from config import settings


class RabbitMQClient:
    def __init__(self):
        self.connection = None
        self.channel = None
        self.exchange = None
        self._connect_lock = asyncio.Lock()
        self._connect_task = None
        self._exchange_name = "pos_events"

    def is_connected(self) -> bool:
        return bool(
            self.connection
            and not self.connection.is_closed
            and self.channel
            and not self.channel.is_closed
            and self.exchange
        )

    async def _open_connection(self):
        self.connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
        self.channel = await self.connection.channel()

        self.exchange = await self.channel.declare_exchange(
            self._exchange_name, aio_pika.ExchangeType.TOPIC, durable=True
        )

        print("✅ RabbitMQ connected")

    async def connect(self, retries: int = 10, delay_seconds: int = 3) -> bool:
        async with self._connect_lock:
            if self.is_connected():
                return True

            last_error = None
            for attempt in range(1, retries + 1):
                try:
                    await self._open_connection()
                    return True
                except Exception as exc:
                    last_error = exc
                    print(
                        f"⚠️ RabbitMQ connect attempt {attempt}/{retries} failed: {exc}"
                    )
                    if attempt < retries:
                        await asyncio.sleep(delay_seconds)

            print(f"❌ RabbitMQ unavailable after {retries} attempts: {last_error}")
            return False

    async def ensure_connected(self) -> bool:
        if self.is_connected():
            return True
        return await self.connect(retries=3, delay_seconds=2)

    async def connect_in_background(self, retries: int = 60, delay_seconds: int = 2):
        if self._connect_task and not self._connect_task.done():
            return

        async def _runner():
            await self.connect(retries=retries, delay_seconds=delay_seconds)

        self._connect_task = asyncio.create_task(_runner())

    async def close(self):
        if self._connect_task and not self._connect_task.done():
            self._connect_task.cancel()
        if self.connection:
            await self.connection.close()
            print("👋 RabbitMQ disconnected")

    async def publish(self, routing_key: str, message: dict):
        if not await self.ensure_connected():
            print(f"⚠️ Skipped publish, RabbitMQ not connected: {routing_key}")
            return

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
        if not await self.ensure_connected():
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
