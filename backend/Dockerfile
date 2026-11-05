FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./
RUN python manage.py train_risk_model --seed 42
CMD ["sh", "-c", "python manage.py migrate --noinput && waitress-serve --listen=0.0.0.0:8000 config.wsgi:application"]
