# Multi-stage Dockerfile for VeloGo Spring Boot Backend
FROM maven:3.9.6-eclipse-temurin-21-alpine AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S velogo && adduser -S velogo -G velogo
USER velogo
COPY --from=builder /app/target/velogo-backend-1.0.0-SNAPSHOT.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
