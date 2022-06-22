# Contributing

The following are rules for writing code in this repository that aren't enforced automatically via [eslint](./.eslintrc.js) and [prettier](./.prettierrc.json). You should try to follow them if possible, but exceptions can be made.

-   [Logging](#logging)
    -   [Error Logging](#error-logging)
-   [Error Handling](#error-handling)
-   [Message Sending](#message-sending)

### Logging

-   `console.log` is preferred to `stdout` and other console methods.
-   Messages should be capitalized but not end in a full-stop.

    ```ts
    ❌ console.log('logged in successfully.');
    ✅ console.log('Logged in successfully');
    ```

#### Error Logging

-   If the error is expected, log a custom message instead of the whole error.

    ```ts
    // good
    try {
        // ...
    } catch (error) {
        if (error instanceof Error && error.message.includes('config.json')) {
            console.log(`missing ${Colours.FgMagenta}config.json${Colours.Reset} file in root directory`);
        } else console.log(error);
    }

    // bad
    try {
        // ...
    } catch (error) {
        console.log(error);
    }
    ```

### Error Handling

-   Fatal errors can call `process.exit(1)`.

### Message Sending

-   When sending Discord messages, capitalize the first word but don't end in a full-stop.
    ```ts
    ❌ channel.send({ content: 'Added to the queue.' });
    ✅ channel.send({ content: 'Added to the queue' });
    ```
-   Messages should be sent as `MessageOptions`, not `string`. This makes testing easier.

    ```ts
    ❌ channel.send('There are 5 items in the queue');
    ✅ channel.send({ content: 'There are 5 items in the queue'});
    ```

### JSDoc Commenting

-   Multiline comments should start on the second line.

```ts
/**
 * comment line 1
 * comment line 2
 */
function myFunction() {
    //
}
```

-   Single line comments look like this:

```ts
/** comment line 1 */
function myFunction() {
    //
}
```

### Exporting

Don't use export default.
