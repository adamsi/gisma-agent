package iaf.ofek.sigma.ai;

import org.springframework.ai.vectorstore.pgvector.autoconfigure.PgVectorStoreAutoConfiguration;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@EnableAsync
@SpringBootApplication(exclude = PgVectorStoreAutoConfiguration.class)
public class SigmaAgentServer {

    public static void main(String[] args) {
        SpringApplication.run(SigmaAgentServer.class, args);
    }

}
