services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: khalasa
      POSTGRES_USER: khalasa
      POSTGRES_PASSWORD: khalasa_dev_password
    ports:
      - "5432:5432"
    volumes:
      - khalasa_pg_data:/var/lib/postgresql/data
volumes:
  khalasa_pg_data:
