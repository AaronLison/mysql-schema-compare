# MySQL Schema Compare

A tool to compare two MySQL database schemas and highlight differences. Useful for database migrations, version control, and ensuring consistency between environments.

## Features

- Compare table structures, indexes, and constraints
- Generate reports of schema differences

  
### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy the example environment file and fill in your MySQL connection details.

```bash
cp .env.example .env
```

Edit the `.env` file to provide the necessary configuration.

### 3. Generate migration queries

```bash
npm run start
```

This will compare the schemas and generate SQL queries in the `output` folder.

### 4. Apply migration queries to the database

```bash
npm run apply
```

This will execute the generated queries on the target database.

Make sure your MySQL connection details are configured as required by the project.

For easier use, you can create a .sh script with following contents
```
cd /Users/x/y/z/mysql-schema-compare
node index.js apply
echo "Mysql schema applied"
```

**Optional flags for `npm run apply`:**

- `--include-indexes`: Also execute queries that update indexes.

**Example:**

```bash
npm run apply -- --include-indexes
```

This will apply both schema and index changes to the target database.

## Contributing

Contributions are welcome! To contribute:

1. Fork this repository.
2. Create a new branch for your feature or bugfix.
3. Make your changes and add tests if applicable.
4. Submit a pull request with a clear description of your changes.

Please follow the existing code style and conventions.
