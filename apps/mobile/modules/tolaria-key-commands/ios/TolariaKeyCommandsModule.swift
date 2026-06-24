import ExpoModulesCore
import React
import UIKit

private struct TolariaKeyCommand {
  let action: String
  let altKey: Bool
  let code: String
  let ctrlKey: Bool
  let input: String
  let key: String
  let metaKey: Bool
  let modifierFlags: UIKeyModifierFlags
  let shiftKey: Bool
}

public class TolariaKeyCommandsModule: Module {
  private var registered = false
  private let commands: [TolariaKeyCommand] = [
    TolariaKeyCommand(
      action: "commandPalette",
      altKey: false,
      code: "KeyK",
      ctrlKey: false,
      input: "k",
      key: "k",
      metaKey: true,
      modifierFlags: .command,
      shiftKey: false
    ),
    TolariaKeyCommand(
      action: "findInNote",
      altKey: false,
      code: "KeyF",
      ctrlKey: false,
      input: "f",
      key: "f",
      metaKey: true,
      modifierFlags: .command,
      shiftKey: false
    ),
    TolariaKeyCommand(
      action: "search",
      altKey: false,
      code: "KeyO",
      ctrlKey: false,
      input: "o",
      key: "o",
      metaKey: true,
      modifierFlags: .command,
      shiftKey: false
    ),
    TolariaKeyCommand(
      action: "search",
      altKey: false,
      code: "KeyP",
      ctrlKey: false,
      input: "p",
      key: "p",
      metaKey: true,
      modifierFlags: .command,
      shiftKey: false
    ),
    TolariaKeyCommand(
      action: "toggleRawEditor",
      altKey: false,
      code: "Backslash",
      ctrlKey: false,
      input: "\\",
      key: "\\",
      metaKey: true,
      modifierFlags: .command,
      shiftKey: false
    ),
    TolariaKeyCommand(
      action: "createNote",
      altKey: false,
      code: "KeyN",
      ctrlKey: false,
      input: "n",
      key: "n",
      metaKey: true,
      modifierFlags: .command,
      shiftKey: false
    ),
    TolariaKeyCommand(
      action: "previousNote",
      altKey: false,
      code: "ArrowUp",
      ctrlKey: false,
      input: UIKeyCommand.inputUpArrow,
      key: "ArrowUp",
      metaKey: false,
      modifierFlags: [],
      shiftKey: false
    ),
    TolariaKeyCommand(
      action: "nextNote",
      altKey: false,
      code: "ArrowDown",
      ctrlKey: false,
      input: UIKeyCommand.inputDownArrow,
      key: "ArrowDown",
      metaKey: false,
      modifierFlags: [],
      shiftKey: false
    )
  ]

  public func definition() -> ModuleDefinition {
    Name("TolariaKeyCommands")

    Events("onShortcut")

    Function("isSupported") {
      return true
    }

    OnStartObserving("onShortcut") {
      self.registerCommands()
    }

    OnStopObserving("onShortcut") {
      self.unregisterCommands()
    }
  }

  private func registerCommands() {
    runOnMain {
      guard !self.registered else { return }

      for command in self.commands {
        RCTKeyCommands.sharedInstance().registerKeyCommand(
          withInput: command.input,
          modifierFlags: command.modifierFlags
        ) { [weak self] _ in
          self?.sendShortcut(command)
        }
      }

      self.registered = true
    }
  }

  private func unregisterCommands() {
    runOnMain {
      guard self.registered else { return }

      for command in self.commands {
        RCTKeyCommands.sharedInstance().unregisterKeyCommand(
          withInput: command.input,
          modifierFlags: command.modifierFlags
        )
      }

      self.registered = false
    }
  }

  private func sendShortcut(_ command: TolariaKeyCommand) {
    sendEvent("onShortcut", [
      "action": command.action,
      "altKey": command.altKey,
      "code": command.code,
      "ctrlKey": command.ctrlKey,
      "key": command.key,
      "metaKey": command.metaKey,
      "shiftKey": command.shiftKey,
      "source": "native"
    ])
  }

  private func runOnMain(_ action: @escaping () -> Void) {
    if Thread.isMainThread {
      action()
    } else {
      DispatchQueue.main.async(execute: action)
    }
  }
}
