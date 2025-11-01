# Contributing

- Useless/Joke features generally won't be accepted.
- ESLint and Prettier are recommended, with the former being enforced by the CI.
  - VSCode is also recommended since it'll organise imports automatically when saving.
- Enums shouldn't be pluralised unless they are bitfields.
- Accompanying tests are recommended but not required.
- Use NZ spelling for user-facing text, comments, and test names; use US spelling in the code itself.
- Always have limits on things like timeouts and array sizes, especially if they can come from the user (e.g. queueing playlists).
- Prefer regular functions over arrow functions where possible (anonymous functions are fine as arrow functions).
- Code comments should be funny.
- When making error messages from template literals, multiline strings should be extracted to their own variable for readability.
