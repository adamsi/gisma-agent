FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /app

COPY ../../ ./

WORKDIR /app/gisma-ai-back/gisma-agent-server
RUN ./mvnw clean package -DskipTests -B

FROM eclipse-temurin:17-jdk-jammy AS runtime
WORKDIR /app

COPY --from=build /app/gisma-ai-back/gisma-agent-server/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]