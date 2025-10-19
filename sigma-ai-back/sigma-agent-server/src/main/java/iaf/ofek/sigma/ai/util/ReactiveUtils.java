package iaf.ofek.sigma.ai.util;

import lombok.extern.log4j.Log4j2;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.concurrent.Callable;

@Log4j2
public class ReactiveUtils {

    public static <T> Mono<T> runBlockingAsync(Callable<T> callable) {
        return Mono.fromCallable(callable)
                .subscribeOn(Schedulers.boundedElastic()) // moves blocking call off main thread
                .onErrorResume(ex -> {
                    log.error("Error during async blocking execution: {}.", ex.getMessage());
                    return Mono.empty();
                });
    }

    public static <T> Mono<T> runBlockingAsync(Callable<T> callable, T fallback) {
        return Mono.fromCallable(callable)
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorResume(ex -> {
                    log.error("Error during async blocking execution: {}.", ex.getMessage());
                    return Mono.just(fallback);
                });
    }

}
