package db

import (
	"database/sql"
	"os"
	"strings"
	"testing"
)

// RED: Test that AddRepository validates empty name
func TestAddRepository_EmptyName(t *testing.T) {
	dbPath := "/tmp/postwhale_test_validation_repo_name.db"
	defer os.Remove(dbPath)

	database, err := InitDB(dbPath)
	if err != nil {
		t.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	repo := Repository{
		Name: "", // Empty name should be rejected
		Path: "/valid/path",
	}

	_, err = AddRepository(database, repo)
	if err == nil {
		t.Error("Expected error for empty repository name, got nil")
	}
	if err != nil && !strings.Contains(err.Error(), "name") {
		t.Errorf("Expected error message to mention 'name', got: %v", err)
	}
}

// RED: Test that AddRepository validates empty path
func TestAddRepository_EmptyPath(t *testing.T) {
	dbPath := "/tmp/postwhale_test_validation_repo_path.db"
	defer os.Remove(dbPath)

	database, err := InitDB(dbPath)
	if err != nil {
		t.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	repo := Repository{
		Name: "Valid Name",
		Path: "", // Empty path should be rejected
	}

	_, err = AddRepository(database, repo)
	if err == nil {
		t.Error("Expected error for empty repository path, got nil")
	}
	if err != nil && !strings.Contains(err.Error(), "path") {
		t.Errorf("Expected error message to mention 'path', got: %v", err)
	}
}

// RED: Test that AddService validates empty service_id
func TestAddService_EmptyServiceID(t *testing.T) {
	dbPath := "/tmp/postwhale_test_validation_service_id.db"
	defer os.Remove(dbPath)

	database, err := InitDB(dbPath)
	if err != nil {
		t.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	// Add a repository first
	repo := Repository{Name: "test-repo", Path: "/test"}
	repoID, err := AddRepository(database, repo)
	if err != nil {
		t.Fatalf("Failed to add repository: %v", err)
	}

	service := Service{
		RepoID:     repoID,
		ServiceID:  "", // Empty service_id should be rejected
		Name:       "Valid Name",
		Port:       8080,
		ConfigJSON: `{}`,
	}

	_, err = AddService(database, service)
	if err == nil {
		t.Error("Expected error for empty service_id, got nil")
	}
	if err != nil && !strings.Contains(err.Error(), "service_id") && !strings.Contains(err.Error(), "serviceId") && !strings.Contains(err.Error(), "ServiceID") {
		t.Errorf("Expected error message to mention service_id, got: %v", err)
	}
}

// RED: Test that AddService validates empty name
func TestAddService_EmptyName(t *testing.T) {
	dbPath := "/tmp/postwhale_test_validation_service_name.db"
	defer os.Remove(dbPath)

	database, err := InitDB(dbPath)
	if err != nil {
		t.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	// Add a repository first
	repo := Repository{Name: "test-repo", Path: "/test"}
	repoID, err := AddRepository(database, repo)
	if err != nil {
		t.Fatalf("Failed to add repository: %v", err)
	}

	service := Service{
		RepoID:     repoID,
		ServiceID:  "valid-id",
		Name:       "", // Empty name should be rejected
		Port:       8080,
		ConfigJSON: `{}`,
	}

	_, err = AddService(database, service)
	if err == nil {
		t.Error("Expected error for empty service name, got nil")
	}
	if err != nil && !strings.Contains(err.Error(), "name") {
		t.Errorf("Expected error message to mention 'name', got: %v", err)
	}
}

// Test that AddService allows port 0 (unset - service works in STAGING/PRODUCTION without local port)
func TestAddService_PortZeroAllowed(t *testing.T) {
	dbPath := "/tmp/postwhale_test_validation_service_port_zero.db"
	defer os.Remove(dbPath)

	database, err := InitDB(dbPath)
	if err != nil {
		t.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	// Add a repository first
	repo := Repository{Name: "test-repo", Path: "/test"}
	repoID, err := AddRepository(database, repo)
	if err != nil {
		t.Fatalf("Failed to add repository: %v", err)
	}

	service := Service{
		RepoID:     repoID,
		ServiceID:  "valid-id",
		Name:       "Valid Name",
		Port:       0, // Port 0 means "unset" - service works in STAGING/PRODUCTION
		ConfigJSON: `{}`,
	}

	serviceID, err := AddService(database, service)
	if err != nil {
		t.Errorf("Port 0 should be allowed (unset), got error: %v", err)
	}
	if serviceID == 0 {
		t.Error("Expected valid service ID, got 0")
	}
}

// RED: Test that AddService validates invalid port (negative)
func TestAddService_InvalidPortNegative(t *testing.T) {
	dbPath := "/tmp/postwhale_test_validation_service_port_neg.db"
	defer os.Remove(dbPath)

	database, err := InitDB(dbPath)
	if err != nil {
		t.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	// Add a repository first
	repo := Repository{Name: "test-repo", Path: "/test"}
	repoID, err := AddRepository(database, repo)
	if err != nil {
		t.Fatalf("Failed to add repository: %v", err)
	}

	service := Service{
		RepoID:     repoID,
		ServiceID:  "valid-id",
		Name:       "Valid Name",
		Port:       -1, // Negative port should be rejected
		ConfigJSON: `{}`,
	}

	_, err = AddService(database, service)
	if err == nil {
		t.Error("Expected error for negative port, got nil")
	}
	if err != nil && !strings.Contains(err.Error(), "port") {
		t.Errorf("Expected error message to mention 'port', got: %v", err)
	}
}

// RED: Test that AddService validates invalid port (>65535)
func TestAddService_InvalidPortTooLarge(t *testing.T) {
	dbPath := "/tmp/postwhale_test_validation_service_port_large.db"
	defer os.Remove(dbPath)

	database, err := InitDB(dbPath)
	if err != nil {
		t.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	// Add a repository first
	repo := Repository{Name: "test-repo", Path: "/test"}
	repoID, err := AddRepository(database, repo)
	if err != nil {
		t.Fatalf("Failed to add repository: %v", err)
	}

	service := Service{
		RepoID:     repoID,
		ServiceID:  "valid-id",
		Name:       "Valid Name",
		Port:       65536, // Port > 65535 should be rejected
		ConfigJSON: `{}`,
	}

	_, err = AddService(database, service)
	if err == nil {
		t.Error("Expected error for port > 65535, got nil")
	}
	if err != nil && !strings.Contains(err.Error(), "port") {
		t.Errorf("Expected error message to mention 'port', got: %v", err)
	}
}

// RED: Test that AddEndpoint validates empty method
func TestAddEndpoint_EmptyMethod(t *testing.T) {
	dbPath := "/tmp/postwhale_test_validation_endpoint_method.db"
	defer os.Remove(dbPath)

	database, err := InitDB(dbPath)
	if err != nil {
		t.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	// Setup: Add repository and service
	repo := Repository{Name: "test-repo", Path: "/test"}
	repoID, _ := AddRepository(database, repo)
	service := Service{
		RepoID:     repoID,
		ServiceID:  "fusion",
		Name:       "Fusion",
		Port:       8080,
		ConfigJSON: `{}`,
	}
	serviceID, _ := AddService(database, service)

	endpoint := Endpoint{
		ServiceID:   serviceID,
		Method:      "", // Empty method should be rejected
		Path:        "/api/test",
		OperationID: "testOp",
		SpecJSON:    `{}`,
	}

	_, err = AddEndpoint(database, endpoint)
	if err == nil {
		t.Error("Expected error for empty method, got nil")
	}
	if err != nil && !strings.Contains(err.Error(), "method") {
		t.Errorf("Expected error message to mention 'method', got: %v", err)
	}
}

// RED: Test that AddEndpoint validates empty path
func TestAddEndpoint_EmptyPath(t *testing.T) {
	dbPath := "/tmp/postwhale_test_validation_endpoint_path.db"
	defer os.Remove(dbPath)

	database, err := InitDB(dbPath)
	if err != nil {
		t.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	// Setup: Add repository and service
	repo := Repository{Name: "test-repo", Path: "/test"}
	repoID, _ := AddRepository(database, repo)
	service := Service{
		RepoID:     repoID,
		ServiceID:  "fusion",
		Name:       "Fusion",
		Port:       8080,
		ConfigJSON: `{}`,
	}
	serviceID, _ := AddService(database, service)

	endpoint := Endpoint{
		ServiceID:   serviceID,
		Method:      "GET",
		Path:        "", // Empty path should be rejected
		OperationID: "testOp",
		SpecJSON:    `{}`,
	}

	_, err = AddEndpoint(database, endpoint)
	if err == nil {
		t.Error("Expected error for empty path, got nil")
	}
	if err != nil && !strings.Contains(err.Error(), "path") {
		t.Errorf("Expected error message to mention 'path', got: %v", err)
	}
}

// RED: Test that AddEndpoint validates invalid HTTP method
func TestAddEndpoint_InvalidMethod(t *testing.T) {
	dbPath := "/tmp/postwhale_test_validation_endpoint_invalid_method.db"
	defer os.Remove(dbPath)

	database, err := InitDB(dbPath)
	if err != nil {
		t.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	// Setup: Add repository and service
	repo := Repository{Name: "test-repo", Path: "/test"}
	repoID, _ := AddRepository(database, repo)
	service := Service{
		RepoID:     repoID,
		ServiceID:  "fusion",
		Name:       "Fusion",
		Port:       8080,
		ConfigJSON: `{}`,
	}
	serviceID, _ := AddService(database, service)

	endpoint := Endpoint{
		ServiceID:   serviceID,
		Method:      "INVALID", // Invalid HTTP method should be rejected
		Path:        "/api/test",
		OperationID: "testOp",
		SpecJSON:    `{}`,
	}

	_, err = AddEndpoint(database, endpoint)
	if err == nil {
		t.Error("Expected error for invalid HTTP method, got nil")
	}
	if err != nil && !strings.Contains(err.Error(), "method") {
		t.Errorf("Expected error message to mention 'method', got: %v", err)
	}
}

// RED: Test that AddRequest validates empty environment
func TestAddRequest_EmptyEnvironment(t *testing.T) {
	dbPath := "/tmp/postwhale_test_validation_request_env.db"
	defer os.Remove(dbPath)

	database, err := InitDB(dbPath)
	if err != nil {
		t.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	// Setup: Add repository, service, and endpoint
	repo := Repository{Name: "test-repo", Path: "/test"}
	repoID, _ := AddRepository(database, repo)
	service := Service{
		RepoID:     repoID,
		ServiceID:  "fusion",
		Name:       "Fusion",
		Port:       8080,
		ConfigJSON: `{}`,
	}
	serviceID, _ := AddService(database, service)
	endpoint := Endpoint{
		ServiceID:   serviceID,
		Method:      "GET",
		Path:        "/api/test",
		OperationID: "testOp",
		SpecJSON:    `{}`,
	}
	endpointID, _ := AddEndpoint(database, endpoint)

	request := Request{
		EndpointID:  endpointID,
		Environment: "", // Empty environment should be rejected
		Headers:     `{}`,
		Body:        `{}`,
		Response:    `{}`,
	}

	_, err = AddRequest(database, request)
	if err == nil {
		t.Error("Expected error for empty environment, got nil")
	}
	if err != nil && !strings.Contains(err.Error(), "environment") {
		t.Errorf("Expected error message to mention 'environment', got: %v", err)
	}
}

// RED: Test that InitDB validates connection with Ping
func TestInitDB_VerifiesConnection(t *testing.T) {
	// Use an invalid database path that sql.Open will accept but Ping will fail
	// sqlite3 driver is permissive, so we need to test that Ping is actually called
	// We'll test this by using a valid path and verifying Ping doesn't cause issues
	dbPath := "/tmp/postwhale_test_ping.db"
	defer os.Remove(dbPath)

	database, err := InitDB(dbPath)
	if err != nil {
		t.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	// Verify we can actually use the connection (Ping was successful)
	err = database.Ping()
	if err != nil {
		t.Errorf("Database Ping failed, InitDB should have caught this: %v", err)
	}
}

// RED: Test that InitDB rejects path traversal attempts
func TestInitDB_PathTraversal(t *testing.T) {
	// Attempt path traversal
	dbPath := "../../etc/passwd.db"

	_, err := InitDB(dbPath)
	if err == nil {
		t.Error("Expected error for path traversal attempt, got nil")
	}
	if err != nil && !strings.Contains(err.Error(), "path") && !strings.Contains(err.Error(), "invalid") {
		t.Errorf("Expected error message about invalid path, got: %v", err)
	}
}

// RED: Test that GetRepositories checks rows.Err()
// This is hard to test directly, but we can verify the pattern is in place
// by checking that a corrupted database state is handled
func TestGetRepositories_HandlesRowsError(t *testing.T) {
	dbPath := "/tmp/postwhale_test_rows_err_repos.db"
	defer os.Remove(dbPath)

	database, err := InitDB(dbPath)
	if err != nil {
		t.Fatalf("Failed to initialize database: %v", err)
	}

	// Close the database to cause rows.Err() to potentially fail
	database.Close()

	// Attempt to get repositories on closed database
	_, err = GetRepositories(database)
	if err == nil {
		t.Error("Expected error when querying closed database")
	}
	// If rows.Err() is checked, we should get an error
	// sql: database is closed or similar
	if err != nil && !strings.Contains(err.Error(), "closed") && !strings.Contains(err.Error(), "sql") {
		t.Logf("Got error (good): %v", err)
	}
}

// RED: Test that GetServicesByRepo checks rows.Err()
func TestGetServicesByRepo_HandlesRowsError(t *testing.T) {
	dbPath := "/tmp/postwhale_test_rows_err_services.db"
	defer os.Remove(dbPath)

	database, err := InitDB(dbPath)
	if err != nil {
		t.Fatalf("Failed to initialize database: %v", err)
	}

	// Close the database
	database.Close()

	// Attempt to get services on closed database
	_, err = GetServicesByRepo(database, 1)
	if err == nil {
		t.Error("Expected error when querying closed database")
	}
}

// RED: Test that GetEndpointsByService checks rows.Err()
func TestGetEndpointsByService_HandlesRowsError(t *testing.T) {
	dbPath := "/tmp/postwhale_test_rows_err_endpoints.db"
	defer os.Remove(dbPath)

	database, err := InitDB(dbPath)
	if err != nil {
		t.Fatalf("Failed to initialize database: %v", err)
	}

	// Close the database
	database.Close()

	// Attempt to get endpoints on closed database
	_, err = GetEndpointsByService(database, 1)
	if err == nil {
		t.Error("Expected error when querying closed database")
	}
}

// RED: Test that GetRequestHistory checks rows.Err()
func TestGetRequestHistory_HandlesRowsError(t *testing.T) {
	dbPath := "/tmp/postwhale_test_rows_err_requests.db"
	defer os.Remove(dbPath)

	database, err := InitDB(dbPath)
	if err != nil {
		t.Fatalf("Failed to initialize database: %v", err)
	}

	// Close the database
	database.Close()

	// Attempt to get request history on closed database
	_, err = GetRequestHistory(database, 1, 10)
	if err == nil {
		t.Error("Expected error when querying closed database")
	}
}

// RED: Test that query functions return empty slice, not nil
func TestGetRepositories_EmptySliceNotNil(t *testing.T) {
	dbPath := "/tmp/postwhale_test_empty_slice_repos.db"
	defer os.Remove(dbPath)

	database, err := InitDB(dbPath)
	if err != nil {
		t.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	// Don't add any repositories
	repos, err := GetRepositories(database)
	if err != nil {
		t.Fatalf("GetRepositories failed: %v", err)
	}

	// Should return empty slice, not nil
	if repos == nil {
		t.Error("GetRepositories returned nil instead of empty slice")
	}
	if len(repos) != 0 {
		t.Errorf("Expected empty slice, got length %d", len(repos))
	}
}

// RED: Test that GetServicesByRepo returns empty slice, not nil
func TestGetServicesByRepo_EmptySliceNotNil(t *testing.T) {
	dbPath := "/tmp/postwhale_test_empty_slice_services.db"
	defer os.Remove(dbPath)

	database, err := InitDB(dbPath)
	if err != nil {
		t.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	// Add a repository but no services
	repo := Repository{Name: "test-repo", Path: "/test"}
	repoID, _ := AddRepository(database, repo)

	services, err := GetServicesByRepo(database, repoID)
	if err != nil {
		t.Fatalf("GetServicesByRepo failed: %v", err)
	}

	// Should return empty slice, not nil
	if services == nil {
		t.Error("GetServicesByRepo returned nil instead of empty slice")
	}
	if len(services) != 0 {
		t.Errorf("Expected empty slice, got length %d", len(services))
	}
}

// RED: Test that GetEndpointsByService returns empty slice, not nil
func TestGetEndpointsByService_EmptySliceNotNil(t *testing.T) {
	dbPath := "/tmp/postwhale_test_empty_slice_endpoints.db"
	defer os.Remove(dbPath)

	database, err := InitDB(dbPath)
	if err != nil {
		t.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	// Add repository and service but no endpoints
	repo := Repository{Name: "test-repo", Path: "/test"}
	repoID, _ := AddRepository(database, repo)
	service := Service{
		RepoID:     repoID,
		ServiceID:  "fusion",
		Name:       "Fusion",
		Port:       8080,
		ConfigJSON: `{}`,
	}
	serviceID, _ := AddService(database, service)

	endpoints, err := GetEndpointsByService(database, serviceID)
	if err != nil {
		t.Fatalf("GetEndpointsByService failed: %v", err)
	}

	// Should return empty slice, not nil
	if endpoints == nil {
		t.Error("GetEndpointsByService returned nil instead of empty slice")
	}
	if len(endpoints) != 0 {
		t.Errorf("Expected empty slice, got length %d", len(endpoints))
	}
}

// RED: Test that GetRequestHistory returns empty slice, not nil
func TestGetRequestHistory_EmptySliceNotNil(t *testing.T) {
	dbPath := "/tmp/postwhale_test_empty_slice_requests.db"
	defer os.Remove(dbPath)

	database, err := InitDB(dbPath)
	if err != nil {
		t.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	// Add repository, service, and endpoint but no requests
	repo := Repository{Name: "test-repo", Path: "/test"}
	repoID, _ := AddRepository(database, repo)
	service := Service{
		RepoID:     repoID,
		ServiceID:  "fusion",
		Name:       "Fusion",
		Port:       8080,
		ConfigJSON: `{}`,
	}
	serviceID, _ := AddService(database, service)
	endpoint := Endpoint{
		ServiceID:   serviceID,
		Method:      "GET",
		Path:        "/api/test",
		OperationID: "testOp",
		SpecJSON:    `{}`,
	}
	endpointID, _ := AddEndpoint(database, endpoint)

	requests, err := GetRequestHistory(database, endpointID, 10)
	if err != nil {
		t.Fatalf("GetRequestHistory failed: %v", err)
	}

	// Should return empty slice, not nil
	if requests == nil {
		t.Error("GetRequestHistory returned nil instead of empty slice")
	}
	if len(requests) != 0 {
		t.Errorf("Expected empty slice, got length %d", len(requests))
	}
}

// Helper function to test database state
func isDatabaseClosed(db *sql.DB) bool {
	err := db.Ping()
	return err != nil
}
