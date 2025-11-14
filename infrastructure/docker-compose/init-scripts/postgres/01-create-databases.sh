#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create databases for each service
    CREATE DATABASE leads;
    CREATE DATABASE customers;
    CREATE DATABASE proposals;
    CREATE DATABASE financial;
    CREATE DATABASE latam_compliance;

    -- Grant privileges
    GRANT ALL PRIVILEGES ON DATABASE leads TO dev;
    GRANT ALL PRIVILEGES ON DATABASE customers TO dev;
    GRANT ALL PRIVILEGES ON DATABASE proposals TO dev;
    GRANT ALL PRIVILEGES ON DATABASE financial TO dev;
    GRANT ALL PRIVILEGES ON DATABASE latam_compliance TO dev;

    -- Enable UUID extension in all databases
    \c leads
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    \c customers
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    \c proposals
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    \c financial
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    \c latam_compliance
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOSQL

echo "Databases created successfully!"
