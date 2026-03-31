FROM python:3.11-slim

WORKDIR /app

# зависимости
COPY requirements.txt .

RUN apt-get update && \
    apt-get install -y ffmpeg && \
    rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    --trusted-host pypi.org \
    --trusted-host pypi.python.org \
    --trusted-host files.pythonhosted.org \
    -r requirements.txt

COPY . .

# порт
EXPOSE 8000

# запуск
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
