# Command Pattern

> Date: 2026-03-17

## 1. Definition
The **Command** pattern is a behavioral design pattern that **encapsulates a request (an action) as an object**. This turns an operation into a standalone object that can be **passed around, queued, logged, stored, composed, and executed later**.

## 2. Intent (Goal of the pattern)
- **Decouple** the object that *invokes* an operation from the object that *performs* it.
- Make actions **first-class objects**, enabling:
  - **Undo/redo**
  - **Queueing and scheduling**
  - **Logging/auditing**
  - **Retry and replay**
  - **Macro commands** (group multiple actions)

## 3. Problem it solves
In many applications (UI, APIs, job schedulers), you want to trigger operations, but you may also need:
- To avoid tight coupling between callers (buttons/controllers) and business logic classes.
- To support **undoable actions**.
- To **queue or schedule** work for later (background jobs).
- To record actions for **audit logs** or reproduce flows.

Without Command, you often end up with:
- Large `if/else` or `switch` statements mapping user actions to logic.
- UI/controller code directly calling many unrelated services.
- Hard-to-extend designs when new actions are added.

## 4. Motivation (real-world analogy if possible)
A restaurant **order ticket**:
- Customer (Invoker) doesn’t cook.
- Ticket (Command) contains the request details.
- Kitchen (Receiver) performs the work.
- Tickets can be queued, reordered, stored, or re-issued.

## 5. Structure (explain the roles in the pattern)
- **Command**: interface/abstract type that declares `execute()` (and optionally `undo()`).
- **ConcreteCommand**: implements `Command`; stores parameters and a reference to the receiver.
- **Receiver**: knows how to perform the actual work (domain operations).
- **Invoker**: triggers the command’s execution (button, menu item, controller, scheduler).
- **Client**: configures objects—creates receivers and commands and assigns commands to invokers.

## 6. UML diagram explanation
Typical relationships:
- `Invoker` holds a `Command` and calls `command.execute()`.
- `ConcreteCommand` implements `Command` and holds a reference to a `Receiver`.
- `Receiver` provides the real operations.
- `Client` wires everything together.

In short:
- **Invoker → Command** (calls)
- **ConcreteCommand → Receiver** (delegates)

## 7. Implementation example (TypeScript)
Example: a simple remote control that can turn a light on/off and supports undo.

```ts
// 1) Command
interface Command {
    execute(): void;
    undo(): void;
}

// 2) Receiver
class Light {
    private on = false;

    turnOn(): void {
        this.on = true;
        console.log("Light is ON");
    }

    turnOff(): void {
        this.on = false;
        console.log("Light is OFF");
    }

    isOn(): boolean {
        return this.on;
    }
}

// 3) Concrete Commands
class TurnOnLightCommand implements Command {
    private previousState = false;

    constructor(private readonly light: Light) {}

    execute(): void {
        this.previousState = this.light.isOn();
        this.light.turnOn();
    }

    undo(): void {
        if (!this.previousState) {
            this.light.turnOff();
        } else {
            this.light.turnOn();
        }
    }
}

class TurnOffLightCommand implements Command {
    private previousState = false;

    constructor(private readonly light: Light) {}

    execute(): void {
        this.previousState = this.light.isOn();
        this.light.turnOff();
    }

    undo(): void {
        if (this.previousState) {
            this.light.turnOn();
        } else {
            this.light.turnOff();
        }
    }
}

// 4) Invoker
class NoOpCommand implements Command {
    execute(): void {}
    undo(): void {}
}

class RemoteControl {
    private command: Command = new NoOpCommand();
    private lastCommand: Command = new NoOpCommand();

    setCommand(command: Command): void {
        this.command = command;
    }

    pressButton(): void {
        this.command.execute();
        this.lastCommand = this.command;
    }

    pressUndo(): void {
        this.lastCommand.undo();
    }
}

// 5) Client (wiring)
(() => {
    const livingRoomLight = new Light();

    const turnOn: Command = new TurnOnLightCommand(livingRoomLight);
    const turnOff: Command = new TurnOffLightCommand(livingRoomLight);

    const remote = new RemoteControl();

    remote.setCommand(turnOn);
    remote.pressButton(); // Light is ON
    remote.pressUndo();   // Undo -> Light is OFF

    remote.setCommand(turnOff);
    remote.pressButton(); // Light is OFF
    remote.pressUndo();   // Undo -> Light is ON
})();
```

## 8. Step-by-step explanation of the code
1. **Define `Command`**: a common interface with `execute()` and `undo()`.
2. **Create the `Receiver` (`Light`)**:
   - Contains real business operations: `turnOn()`, `turnOff()`.
   - Exposes `isOn()` so commands can capture state for undo.
3. **Create `ConcreteCommand`s**:
   - `TurnOnLightCommand` and `TurnOffLightCommand` each hold a `Light` reference.
   - Each command saves `previousState` before performing the action.
   - `undo()` restores state based on `previousState`.
4. **Create the `Invoker` (`RemoteControl`)**:
   - Holds a `Command` and triggers `execute()` via `pressButton()`.
   - Tracks `lastCommand` so `pressUndo()` can reverse the last action.
5. **Client wires it all**:
   - Instantiates the receiver and commands.
   - Sets commands on the invoker and triggers button presses.

## 9. Advantages
- **Loose coupling** between invoker and receiver.
- Enables **undo/redo** via command history.
- Enables **queueing/scheduling** (store commands and execute later).
- Easier to **log/audit** actions (commands describe “what happened”).
- Supports **macro commands** (compose multiple commands into one).

## 10. Disadvantages
- **More classes/objects** (can be overkill for simple apps).
- **Undo is not always trivial**; may require snapshots (see Memento) or careful state capture.
- Additional indirection can make debugging slightly harder.

## 11. When to use it
- You need **undo/redo** (editors, drawing apps, IDE operations).
- You want **queued or scheduled** tasks (background processing, job systems).
- You want **configurable actions** (buttons/menus mapped to behavior at runtime).
- You want to **log/replay** actions (auditing, event-like behavior).

## 12. When not to use it
- The operation set is tiny and stable and you don’t need undo/queue/logging.
- Adding a command class per action would introduce unnecessary ceremony.
- You can already decouple cleanly with simpler approaches (e.g., direct method calls with a small interface) and no extra requirements.

## 13. Real-world examples
- GUI toolkits: menu items, toolbar buttons, keyboard shortcuts.
- Text editors: typing, delete, paste actions as commands with undo stacks.
- Batch systems: queued jobs executed by workers.
- Smart home: “turn on lights”, “lock doors”, “set thermostat” commands.
- Order processing: “place order”, “cancel order” commands with auditing.

## 14. Related patterns
- **Strategy**: both encapsulate behavior; Strategy selects an algorithm, Command represents an executable request (often queued/logged/undoable).
- **Memento**: often used with Command to capture state for undo.
- **Composite**: can create `MacroCommand` composed of multiple commands.
- **Observer**: UI events can notify invokers that trigger commands.
- **Chain of Responsibility**: a command/request can be passed through handlers until processed.
