package iaf.ofek.sigma.ai.util;

import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.concurrent.Callable;

public class ReactiveUtils {

    public static <T> Mono<T> runBlockingAsync(Callable<T> callable) {
        return Mono.fromCallable(callable)
                .subscribeOn(Schedulers.boundedElastic()); // moves blocking call off main thread
    }

}
