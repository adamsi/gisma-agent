package iaf.ofek.sigma.ai.exception;

public class SchemaValidationException extends RuntimeException {
    public SchemaValidationException(String message, Throwable e) {
        super(message, e);
    }
}
