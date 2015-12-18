# Tests checker

Module checks tests written with mocha/chai/sinon for issues:

* Usage `restore/spy/stub` in the `it`
* To many `expect` in the one `it`
* `it` with empty title

## Install

```
git clone https://github.com/onechiporenko/tests-checker
cd test-checker
npm i
# tests-checker will be available in your $PATH (optional)
npm link
```

## Usage

```
cd test-checker
# or if you linked simply run
tests-checker --help
```

Help:

```
node index.js --help
```

Check each file in the provided path

```
node index.js -p /my/folder/with/tests/**/*.js
```

Check each file in the provided path and save results to the file

```
node index.js -p /my/folder/with/tests/**/*.js -f output.txt --no-color
```
