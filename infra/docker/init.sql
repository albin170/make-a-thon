-- PostgreSQL initialization for Brightloop SMS
-- This runs once on first container startup.

-- Create test database for automated tests
CREATE DATABASE brightloop_sms_test OWNER sms_user;
GRANT ALL PRIVILEGES ON DATABASE brightloop_sms_test TO sms_user;

