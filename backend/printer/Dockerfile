# printer/Dockerfile
FROM python:3.13-slim

WORKDIR /app

ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

COPY requirements.txt ./

RUN apt-get update && apt-get install -y \
    libusb-1.0-0 \
    libusb-1.0-0-dev \
    && rm -rf /var/lib/apt/lists/*
    
RUN uv pip install --system --no-cache -r requirements.txt

COPY . ./

EXPOSE 8006

CMD [ "uvicorn", "__init__:mapp", "--host", "0.0.0.0", "--port", "8006" ]
