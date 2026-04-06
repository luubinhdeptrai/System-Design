# RxJS Learning Guide

## Topic: What is Observable and why RxJS exists?

### 1. Intuition

An `Observable` is a producer of values over time.

That phrase matters:

- `producer`: something creates values
- `values`: data, events, responses, errors
- `over time`: not just now, but later too

If a normal function is like asking for one answer once, an Observable is like subscribing to a source that may keep giving you updates.

Simple mental model:

- Function: "give me one value now"
- Promise: "give me one value later"
- Observable: "give me zero, one, or many values over time"

Why RxJS exists:

JavaScript apps deal with many async things:

- button clicks
- keyboard input
- WebSocket messages
- API calls
- timers
- application events

Without RxJS, these often become a mix of callbacks, event listeners, promises, manual cleanup, and custom state handling.

RxJS gives one consistent model for all of them: streams.

So instead of thinking:

- "This is a click listener"
- "This is a timeout"
- "This is an API promise"

you can think:

- "These are all streams of events or values"

That is the main reason RxJS exists.

Real-world analogy:

- A function is ordering one coffee.
- A Promise is ordering one coffee that will be ready later.
- An Observable is subscribing to a cafe display board that keeps showing every new order status over time.

Common misunderstanding:

- Many beginners think an Observable is just "an async value."
- That is incomplete.
- A Promise gives one future result.
- An Observable models a whole timeline of results.

---

### 2. Diagram

#### A. Basic Observable idea

```text
Time  -------------------------------------------------------------->

Observable source:   --1-----2-----3-----------complete
                         \     \     \
Subscriber receives:     1     2     3
```

The Observable is the source.
The subscriber listens to what arrives over time.

#### B. Subscribe flow

```text
[Observable]
     |
     | subscribe()
     v
[Execution starts]
     |
     +--> next(value)
     |
     +--> next(value)
     |
     +--> complete()
           or
           error(err)
```

Important point:

- For many Observables, nothing happens until `subscribe()` is called.

#### C. Observable lifecycle

```text
1. Observable is created
2. Nobody subscribed yet
3. subscribe() happens
4. Producer starts emitting
5. Subscriber gets next values
6. Stream ends by:
   - complete()
   - error()
   - unsubscribe()
```

#### D. next / error / complete

```text
Case 1: Normal completion

source:   --A---B---C---|
events:     n   n   n   complete

Case 2: Failure

source:   --A---B---X
events:     n   n   error

Case 3: Manual unsubscribe

source:   --A---B---C---D---...
events:     n   n
                unsubscribe here
```

Legend:

- `n` = `next(...)`
- `|` = `complete()`
- `X` = `error(...)`

#### E. Why operator chains matter

```text
source$
  --> filter(valid)
  --> map(toDTO)
  --> debounceTime(300)
  --> switchMap(callApi)
  --> subscriber
```

RxJS is powerful because you do not just receive values; you transform the whole stream before it reaches the subscriber.

---

### 3. Code

#### Example 1: Smallest possible Observable

```ts
import { Observable } from 'rxjs';

const numbers$ = new Observable<number>((subscriber) => {
  subscriber.next(1);
  subscriber.next(2);
  subscriber.next(3);
  subscriber.complete();
});

numbers$.subscribe({
  next: (value) => console.log('next:', value),
  error: (err) => console.error('error:', err),
  complete: () => console.log('complete'),
});
```

What happens:

1. We define an Observable.
2. Inside it, we describe how values are produced.
3. Nothing runs yet.
4. When `subscribe()` is called, values are pushed to the subscriber.

Expected output:

```text
next: 1
next: 2
next: 3
complete
```

#### Example 2: Observable over time

```ts
import { Observable } from 'rxjs';

const timer$ = new Observable<number>((subscriber) => {
  let count = 0;

  const id = setInterval(() => {
    subscriber.next(count);
    count += 1;

    if (count === 3) {
      clearInterval(id);
      subscriber.complete();
    }
  }, 1000);

  return () => {
    clearInterval(id);
    console.log('teardown: interval cleared');
  };
});

const subscription = timer$.subscribe({
  next: (value) => console.log('tick:', value),
  complete: () => console.log('done'),
});
```

Key lesson:

- Observables can emit later, not only immediately.
- They can also define cleanup logic.

#### Example 3: Why RxJS feels useful

```ts
import { fromEvent, map, filter } from 'rxjs';

const input = document.querySelector('input')!;

const inputValue$ = fromEvent<InputEvent>(input, 'input').pipe(
  map(() => input.value.trim()),
  filter((value) => value.length > 2)
);

inputValue$.subscribe((value) => {
  console.log('Search for:', value);
});
```

This means:

- turn DOM input events into a stream
- transform the event into text
- ignore short values
- react only to meaningful input

This is much easier to reason about than scattered event handling logic.

---

### 4. Deep dive

#### Level 3A: What an Observable really is

Under the hood, an Observable is an object with a `subscribe` mechanism.

Conceptually, it behaves like this:

```ts
type Teardown = () => void;

class TinyObservable<T> {
  constructor(
    private init: (observer: {
      next: (value: T) => void;
      error: (err: unknown) => void;
      complete: () => void;
    }) => void | Teardown
  ) {}

  subscribe(observer: {
    next?: (value: T) => void;
    error?: (err: unknown) => void;
    complete?: () => void;
  }) {
    const safeObserver = {
      next: observer.next ?? (() => {}),
      error: observer.error ?? (() => {}),
      complete: observer.complete ?? (() => {}),
    };

    const teardown = this.init(safeObserver);

    return {
      unsubscribe: () => {
        teardown?.();
      },
    };
  }
}
```

This is simplified, but it reveals the core idea:

- Observable stores producer logic.
- `subscribe()` starts that logic.
- emissions go through `next`, `error`, `complete`.
- unsubscribe runs teardown.

#### Level 3B: Lazy execution

This is one of the most important RxJS ideas.

Most Observables are lazy.

That means:

- creating the Observable does not run it
- subscribing runs it

Diagram:

```text
const data$ = new Observable(...)

Step 1: create data$
        no execution yet

Step 2: subscribe()
        execution begins

Step 3: values flow to observer
```

This often surprises beginners who expect Observable creation to immediately do work.

#### Level 3C: Unicast by default

Basic Observables are usually unicast.

That means each subscription gets its own execution.

```ts
import { Observable } from 'rxjs';

const random$ = new Observable<number>((subscriber) => {
  console.log('producing a random number');
  subscriber.next(Math.random());
});

random$.subscribe((value) => console.log('A:', value));
random$.subscribe((value) => console.log('B:', value));
```

Possible output:

```text
producing a random number
A: 0.12
producing a random number
B: 0.87
```

That is two separate executions.

This leads later to the important topic of cold vs hot Observables.

#### Level 3D: Subscription is a resource handle

When you subscribe, you often allocate something:

- an event listener
- a timer
- a socket listener
- an inner subscription

The `Subscription` is your handle for cleanup.

```text
subscribe() --> start work
unsubscribe() --> stop work and release resources
```

This is why forgetting to unsubscribe can cause memory leaks or duplicated behavior.

Common pitfalls:

1. Thinking Observable and Subscription are the same thing.
   - Observable = blueprint / producer definition
   - Subscription = running connection to that producer

2. Thinking `complete()` and `unsubscribe()` are the same.
   - `complete()` means producer says, "I am done."
   - `unsubscribe()` means consumer says, "I am leaving."

3. Thinking Observables always emit many values.
   - They can emit zero, one, or many.

4. Forgetting that errors terminate the stream.
   - After `error()`, the stream is over.

---

### 5. Real-world usage

#### A. UI events

In frontend apps:

- button clicks are streams
- text input changes are streams
- scroll events are streams
- route changes are streams

Example mental model:

```text
User types:    h----he----hel----hell----hello
Stream:        input events over time
Operators:     debounce -> distinct -> API call
Result:        efficient live search
```

#### B. API calls

An HTTP request can be represented as an Observable.

- Promise view: one future response
- Observable view: one response, plus ability to compose with retries, cancellation, timeouts, and other streams

Example:

```text
Search term stream
   --> debounceTime(300)
   --> distinctUntilChanged()
   --> switchMap(http request)
   --> render results
```

That is why RxJS is strong in UI and async orchestration.

#### C. Event-driven architecture

In event-driven systems, services react to events.

Observable mental mapping:

- event bus = stream source
- each event = emitted value
- subscribers = handlers / consumers
- operators = filtering, mapping, routing, enrichment

Diagram:

```text
OrderCreated ---> [stream] ---> filter(highValue)
                           ---> map(toFraudCheckCommand)
                           ---> subscribe(sendToHandler)
```

#### D. CQRS

In CQRS, commands and queries often move through distinct pipelines.

RxJS helps model these flows clearly.

Example mapping:

- command arrives
- validation operator checks it
- mapping operator converts it
- async operator calls handler or repository
- subscriber publishes result or error

```text
Command$ --> validate --> map --> mergeMap(handle) --> result$
```

In NestJS and backend event systems, this way of thinking becomes very powerful because you stop treating async actions as isolated functions and start treating them as composable flows.

#### E. Why teams adopt RxJS

RxJS becomes valuable when an application has:

- many async inputs
- cancellation needs
- event composition
- backpressure-like concerns at app level
- complex UI interaction timing
- polling, retries, timeouts, streaming updates

If your codebase has simple one-off async calls, Promise may be enough.

If your codebase has ongoing async flows, RxJS often becomes much clearer.

---

### 6. Check understanding

1. If I create an Observable but never call `subscribe()`, does it usually start producing values? Why or why not?
2. What is the difference between an `Observable` and a `Subscription`?

---

## Quick summary

- RxJS exists to model asynchronous values and events as streams.
- An Observable is a source of values over time.
- `subscribe()` usually starts execution.
- The stream can emit `next`, then eventually `complete` or `error`.
- A `Subscription` lets you stop listening and clean up resources.
- RxJS becomes especially useful when many async flows must be combined, transformed, or cancelled.

## Next recommended topic

The natural next lesson is:

- Observer vs Observable vs Subscription
- What really happens inside `subscribe()`
- Cold vs Hot Observables

Reply with your answers to the two questions, and then we can continue to the next section.