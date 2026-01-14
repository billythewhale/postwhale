package db

import (
	"os"
	"testing"
	"encoding/json"
)

// RED: Test database initialization
func TestInitDB(t *testing.T) {
	// Use a temporary database file
	dbPath := "/tmp/postwhale_test.db"
	defer os.Remove(dbPath)

	database, err := InitDB(dbPath)
	if err != nil {
		t.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	// Verify tables exist by querying them
	tables := []string{"repositories", "services", "endpoints", "requests"}
	for _, table := range tables {
		var name string
		err := database.QueryRow("SELECT name FROM sqlite_master WHERE type='table' AND name=?", table).Scan(&name)
		if err != nil {
			t.Errorf("Table %s does not exist: %v", table, err)
		}
	}
}

// RED: Test adding a repository
func TestAddRepository(t *testing.T) {
	dbPath := "/tmp/postwhale_test_repo.db"
	defer os.Remove(dbPath)

	database, err := InitDB(dbPath)
	if err != nil {
		t.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	repo := Repository{
		Name: "fake-repo",
		Path: "/Users/billy/postwhale/fake-repo",
	}

	id, err := AddRepository(database, repo)
	if err != nil {
		t.Fatalf("Failed to add repository: %v", err)
	}

	if id == 0 {
		t.Error("Expected non-zero repository ID")
	}

	// Verify repository was added
	var name, path string
	err = database.QueryRow("SELECT name, path FROM repositories WHERE id = ?", id).Scan(&name, &path)
	if err != nil {
		t.Fatalf("Failed to query repository: %v", err)
	}

	if name != repo.Name {
		t.Errorf("Expected name '%s', got '%s'", repo.Name, name)
	}

	if path != repo.Path {
		t.Errorf("Expected path '%s', got '%s'", repo.Path, path)
	}
}

// RED: Test getting all repositories
func TestGetRepositories(t *testing.T) {
	dbPath := "/tmp/postwhale_test_repos.db"
	defer os.Remove(dbPath)

	database, err := InitDB(dbPath)
	if err != nil {
		t.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	// Add test repositories
	repos := []Repository{
		{Name: "repo1", Path: "/path/to/repo1"},
		{Name: "repo2", Path: "/path/to/repo2"},
	}

	for _, repo := range repos {
		_, err := AddRepository(database, repo)
		if err != nil {
			t.Fatalf("Failed to add repository: %v", err)
		}
	}

	// Get all repositories
	retrieved, err := GetRepositories(database)
	if err != nil {
		t.Fatalf("Failed to get repositories: %v", err)
	}

	if len(retrieved) != len(repos) {
		t.Errorf("Expected %d repositories, got %d", len(repos), len(retrieved))
	}
}

// RED: Test adding a service
func TestAddService(t *testing.T) {
	dbPath := "/tmp/postwhale_test_service.db"
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

	// Add a service
	service := Service{
		RepoID:     repoID,
		ServiceID:  "fusion",
		Name:       "Fusion Service",
		Port:       8080,
		ConfigJSON: `{"serviceId":"fusion"}`,
	}

	serviceID, err := AddService(database, service)
	if err != nil {
		t.Fatalf("Failed to add service: %v", err)
	}

	if serviceID == 0 {
		t.Error("Expected non-zero service ID")
	}

	// Verify service was added
	var retrievedServiceID string
	var retrievedPort int
	err = database.QueryRow("SELECT service_id, port FROM services WHERE id = ?", serviceID).Scan(&retrievedServiceID, &retrievedPort)
	if err != nil {
		t.Fatalf("Failed to query service: %v", err)
	}

	if retrievedServiceID != service.ServiceID {
		t.Errorf("Expected service_id '%s', got '%s'", service.ServiceID, retrievedServiceID)
	}

	if retrievedPort != service.Port {
		t.Errorf("Expected port %d, got %d", service.Port, retrievedPort)
	}
}

// RED: Test adding a saved request
func TestAddSavedRequest(t *testing.T) {
	dbPath := ":memory:"
	database, err := InitDB(dbPath)
	if err != nil {
		t.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	// Create test data
	repoID, _ := AddRepository(database, Repository{Name: "test-repo", Path: "/test"})
	serviceID, _ := AddService(database, Service{
		RepoID:     repoID,
		ServiceID:  "test-service",
		Name:       "Test Service",
		Port:       3000,
		ConfigJSON: "{}",
	})
	endpointID, _ := AddEndpoint(database, Endpoint{
		ServiceID:   serviceID,
		Method:      "GET",
		Path:        "/api/test",
		OperationID: "getTest",
		SpecJSON:    "{}",
	})

	// Test data
	pathParams := map[string]string{"id": "123"}
	queryParams := []map[string]interface{}{
		{"key": "limit", "value": "10", "enabled": true},
	}
	headers := []map[string]interface{}{
		{"key": "Authorization", "value": "Bearer token", "enabled": true},
	}

	pathParamsJSON, _ := json.Marshal(pathParams)
	queryParamsJSON, _ := json.Marshal(queryParams)
	headersJSON, _ := json.Marshal(headers)

	savedReq := SavedRequest{
		EndpointID:      endpointID,
		Name:            "Test with auth",
		PathParamsJSON:  string(pathParamsJSON),
		QueryParamsJSON: string(queryParamsJSON),
		HeadersJSON:     string(headersJSON),
		Body:            `{"test": "data"}`,
	}

	id, err := AddSavedRequest(database, savedReq)
	if err != nil {
		t.Fatalf("Failed to add saved request: %v", err)
	}

	if id == 0 {
		t.Error("Expected non-zero saved request ID")
	}

	// Verify saved request was added
	var name string
	err = database.QueryRow("SELECT name FROM saved_requests WHERE id = ?", id).Scan(&name)
	if err != nil {
		t.Fatalf("Failed to query saved request: %v", err)
	}

	if name != savedReq.Name {
		t.Errorf("Expected name '%s', got '%s'", savedReq.Name, name)
	}
}

// RED: Test getting saved requests by endpoint
func TestGetSavedRequestsByEndpoint(t *testing.T) {
	dbPath := ":memory:"
	database, err := InitDB(dbPath)
	if err != nil {
		t.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	// Create test data
	repoID, _ := AddRepository(database, Repository{Name: "test-repo", Path: "/test"})
	serviceID, _ := AddService(database, Service{
		RepoID:     repoID,
		ServiceID:  "test-service",
		Name:       "Test Service",
		Port:       3000,
		ConfigJSON: "{}",
	})
	endpointID, _ := AddEndpoint(database, Endpoint{
		ServiceID:   serviceID,
		Method:      "GET",
		Path:        "/api/test",
		OperationID: "getTest",
		SpecJSON:    "{}",
	})

	// Add saved requests
	savedReq1 := SavedRequest{
		EndpointID:      endpointID,
		Name:            "Request 1",
		PathParamsJSON:  "{}",
		QueryParamsJSON: "[]",
		HeadersJSON:     "[]",
		Body:            "",
	}
	savedReq2 := SavedRequest{
		EndpointID:      endpointID,
		Name:            "Request 2",
		PathParamsJSON:  "{}",
		QueryParamsJSON: "[]",
		HeadersJSON:     "[]",
		Body:            "",
	}

	_, err = AddSavedRequest(database, savedReq1)
	if err != nil {
		t.Fatalf("Failed to add saved request 1: %v", err)
	}
	_, err = AddSavedRequest(database, savedReq2)
	if err != nil {
		t.Fatalf("Failed to add saved request 2: %v", err)
	}

	// Get saved requests
	retrieved, err := GetSavedRequestsByEndpoint(database, endpointID)
	if err != nil {
		t.Fatalf("Failed to get saved requests: %v", err)
	}

	if len(retrieved) != 2 {
		t.Errorf("Expected 2 saved requests, got %d", len(retrieved))
	}

	if retrieved[0].Name != "Request 1" {
		t.Errorf("Expected first request name 'Request 1', got '%s'", retrieved[0].Name)
	}
}

// RED: Test updating saved request
func TestUpdateSavedRequest(t *testing.T) {
	dbPath := ":memory:"
	database, err := InitDB(dbPath)
	if err != nil {
		t.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	// Create test data
	repoID, _ := AddRepository(database, Repository{Name: "test-repo", Path: "/test"})
	serviceID, _ := AddService(database, Service{
		RepoID:     repoID,
		ServiceID:  "test-service",
		Name:       "Test Service",
		Port:       3000,
		ConfigJSON: "{}",
	})
	endpointID, _ := AddEndpoint(database, Endpoint{
		ServiceID:   serviceID,
		Method:      "GET",
		Path:        "/api/test",
		OperationID: "getTest",
		SpecJSON:    "{}",
	})

	savedReq := SavedRequest{
		EndpointID:      endpointID,
		Name:            "Original Name",
		PathParamsJSON:  "{}",
		QueryParamsJSON: "[]",
		HeadersJSON:     "[]",
		Body:            "",
	}

	id, _ := AddSavedRequest(database, savedReq)

	// Update the saved request
	updatedReq := SavedRequest{
		ID:              id,
		EndpointID:      endpointID,
		Name:            "Updated Name",
		PathParamsJSON:  `{"id": "456"}`,
		QueryParamsJSON: "[]",
		HeadersJSON:     "[]",
		Body:            `{"updated": "data"}`,
	}

	err = UpdateSavedRequest(database, updatedReq)
	if err != nil {
		t.Fatalf("Failed to update saved request: %v", err)
	}

	// Verify update
	var name, body string
	err = database.QueryRow("SELECT name, body FROM saved_requests WHERE id = ?", id).Scan(&name, &body)
	if err != nil {
		t.Fatalf("Failed to query updated saved request: %v", err)
	}

	if name != "Updated Name" {
		t.Errorf("Expected name 'Updated Name', got '%s'", name)
	}

	if body != `{"updated": "data"}` {
		t.Errorf("Expected body '{\"updated\": \"data\"}', got '%s'", body)
	}
}

// RED: Test deleting saved request
func TestDeleteSavedRequest(t *testing.T) {
	dbPath := ":memory:"
	database, err := InitDB(dbPath)
	if err != nil {
		t.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	// Create test data
	repoID, _ := AddRepository(database, Repository{Name: "test-repo", Path: "/test"})
	serviceID, _ := AddService(database, Service{
		RepoID:     repoID,
		ServiceID:  "test-service",
		Name:       "Test Service",
		Port:       3000,
		ConfigJSON: "{}",
	})
	endpointID, _ := AddEndpoint(database, Endpoint{
		ServiceID:   serviceID,
		Method:      "GET",
		Path:        "/api/test",
		OperationID: "getTest",
		SpecJSON:    "{}",
	})

	savedReq := SavedRequest{
		EndpointID:      endpointID,
		Name:            "To Delete",
		PathParamsJSON:  "{}",
		QueryParamsJSON: "[]",
		HeadersJSON:     "[]",
		Body:            "",
	}

	id, _ := AddSavedRequest(database, savedReq)

	// Delete the saved request
	err = DeleteSavedRequest(database, id)
	if err != nil {
		t.Fatalf("Failed to delete saved request: %v", err)
	}

	// Verify deletion
	var count int
	err = database.QueryRow("SELECT COUNT(*) FROM saved_requests WHERE id = ?", id).Scan(&count)
	if err != nil {
		t.Fatalf("Failed to query saved request count: %v", err)
	}

	if count != 0 {
		t.Errorf("Expected saved request to be deleted, but found %d", count)
	}
}
