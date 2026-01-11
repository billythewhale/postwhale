package db

import (
	"os"
	"testing"
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
