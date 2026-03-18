# Facade Pattern

## 1. Definition
The **Facade** pattern is a structural design pattern that provides a **simplified, unified interface** to a set of interfaces in a subsystem. It defines a higher-level API that makes the subsystem easier to use.

## 2. Intent (Goal of the pattern)
- Provide a **single entry point** to a complex subsystem.
- Reduce coupling between clients and subsystem implementation details.
- Improve usability by exposing only what the client needs.

## 3. Problem it solves
In real systems, functionality is often implemented across multiple classes/services (a “subsystem”).

Without a Facade:
- Client code must understand subsystem details and call many objects in the correct order.
- Client code becomes tightly coupled to subsystem classes.
- The subsystem becomes harder to change because many clients depend on its internal structure.

Facade solves this by placing a **simple wrapper** in front of the subsystem, so clients interact with **one object** instead of many.

## 4. Motivation (real-world analogy if possible)
Imagine booking a trip:
- Without a travel agent, you personally coordinate flights, hotel, car rental, insurance, and payment—many steps and vendors.
- A travel agent offers a single “bookTrip()” service. Internally they still coordinate the vendors, but you don’t need to.

The travel agent is the **Facade**.

## 5. Structure (explain the roles in the pattern)
- **Client**: The code that needs subsystem functionality.
- **Facade**: The simplified interface exposed to the client. It orchestrates calls to the subsystem.
- **Subsystem classes**: The complex set of classes that implement the actual behavior.

Key idea: the Facade does not replace subsystem classes; it **organizes access** to them.

## 6. UML diagram explanation
Typical relationships:
- Client depends on the Facade.
- Facade depends on multiple subsystem classes.
- Subsystem classes may collaborate with each other (optionally), but the client is insulated from that.

In UML terms:
- Client → Facade (association / dependency)
- Facade → SubsystemA / SubsystemB / SubsystemC (dependencies)

## 7. Implementation example (TypeScript)
Example scenario: “watch a movie” using a home theater subsystem.

### Subsystem classes
```ts
class Amplifier {
    on(): void {
        console.log("Amplifier: on");
    }
    setVolume(level: number): void {
        console.log(`Amplifier: volume=${level}`);
    }
    off(): void {
        console.log("Amplifier: off");
    }
}

class Projector {
    on(): void {
        console.log("Projector: on");
    }
    wideScreenMode(): void {
        console.log("Projector: widescreen mode");
    }
    off(): void {
        console.log("Projector: off");
    }
}

class StreamingPlayer {
    on(): void {
        console.log("Player: on");
    }
    play(movie: string): void {
        console.log(`Player: playing "${movie}"`);
    }
    stop(): void {
        console.log("Player: stop");
    }
    off(): void {
        console.log("Player: off");
    }
}

class TheaterLights {
    dim(level: number): void {
        console.log(`Lights: dim to ${level}%`);
    }
    on(): void {
        console.log("Lights: on");
    }
}
```

### Facade
```ts
class HomeTheaterFacade {
    constructor(
        private readonly amplifier: Amplifier,
        private readonly projector: Projector,
        private readonly player: StreamingPlayer,
        private readonly lights: TheaterLights
    ) {}

    watchMovie(movie: string): void {
        console.log("=== Get ready to watch a movie ===");
        this.lights.dim(10);
        this.projector.on();
        this.projector.wideScreenMode();
        this.amplifier.on();
        this.amplifier.setVolume(7);
        this.player.on();
        this.player.play(movie);
    }

    endMovie(): void {
        console.log("=== Shutting movie theater down ===");
        this.player.stop();
        this.player.off();
        this.amplifier.off();
        this.projector.off();
        this.lights.on();
    }
}
```

### Client
```ts
(() => {
    const amplifier = new Amplifier();
    const projector = new Projector();
    const player = new StreamingPlayer();
    const lights = new TheaterLights();

    const theater = new HomeTheaterFacade(amplifier, projector, player, lights);

    theater.watchMovie("Inception");
    console.log("");
    theater.endMovie();
})();
```

## 8. Step-by-step explanation of the code
1. **Subsystem classes** (`Amplifier`, `Projector`, `StreamingPlayer`, `TheaterLights`) each provide a focused capability.
2. The **client** could call them directly, but it would need to know:
   - what order to call them,
   - which modes/volume/dim levels to set,
   - how to properly shut everything down.
3. The **Facade** (`HomeTheaterFacade`) receives the subsystem objects (via constructor injection).
4. The client calls a single method:
   - `watchMovie(movie)`
   - `endMovie()`
5. Inside those methods, the Facade orchestrates subsystem calls:
   - turns on/sets up devices in a safe, correct order,
   - hides details like “widescreen mode” and “dim to 10%”.
6. If the subsystem changes (e.g., new player type, new initialization steps), the client can often stay the same—only the Facade implementation changes.

## 9. Advantages
- **Simplifies usage**: clients call a small number of methods.
- **Reduces coupling**: clients depend on the Facade, not many subsystem classes.
- **Improves readability**: client code becomes intent-focused (`watchMovie()` reads like the business action).
- **Supports safer workflows**: the Facade can enforce ordering and handle setup/teardown consistently.

## 10. Disadvantages
- Risk of becoming a **“god object”** if the Facade grows too large.
- Can **hide important features** if it oversimplifies (clients may still need direct access to subsystem APIs).
- May add an extra layer to debug if misused (though often worth it).

## 11. When to use it
- When a subsystem is **complex** and you want an easy-to-use entry point.
- When you want to **layer** your system (e.g., UI → Facade → services → repositories).
- When you want to **reduce dependencies** between clients and internal modules.
- When you have a **legacy subsystem** and want a clean interface without rewriting internals.

## 12. When not to use it
- When the subsystem is already simple (Facade adds unnecessary indirection).
- When clients need many specialized operations that don’t fit a simplified API.
- When you actually need **fine-grained control** over subsystem behavior in the client.

## 13. Real-world examples
- **Libraries/SDKs** that provide a single class as an “easy API” over a set of lower-level APIs.
- **Application services** in layered architectures:
  - a `UserService` that coordinates repositories, password hashing, email, auditing, etc.
- **Framework convenience APIs**:
  - e.g., a single `Database` object that internally manages connections, transactions, and statements.

## 14. Related patterns
- **Adapter**: Changes one interface into another expected by the client. Facade simplifies an existing subsystem without necessarily changing interfaces.
- **Mediator**: Coordinates interactions between objects to reduce direct coupling. Facade simplifies access for clients; Mediator manages object-to-object collaboration.
- **Proxy**: Controls access to an object (lazy loading, security, remote proxy). Facade focuses on simplifying a subsystem.
- **Abstract Factory**: Often used to create subsystem objects that a Facade then uses.
