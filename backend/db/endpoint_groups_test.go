package db

import (
	"database/sql"
	"os"
	"path/filepath"
	"testing"

	_ "github.com/mattn/go-sqlite3"
)

func TestAddEndpoint_PersistsEndpointGroups(t *testing.T) {
	t.Parallel()

	database, err := InitDB(":memory:")
	if err != nil {
		t.Fatalf("failed to initialize database: %v", err)
	}
	defer database.Close()

	repoID, err := AddRepository(database, Repository{Name: "liverpool-repo", Path: "/tmp/liverpool"})
	if err != nil {
		t.Fatalf("failed to add repository: %v", err)
	}

	serviceID, err := AddService(database, Service{
		RepoID:     repoID,
		ServiceID:  "virgil",
		Name:       "Virgil Service",
		Port:       8080,
		ConfigJSON: "{}",
	})
	if err != nil {
		t.Fatalf("failed to add service: %v", err)
	}

	_, err = AddEndpoint(database, Endpoint{
		ServiceID:   serviceID,
		Method:      "GET",
		Path:        "/poems",
		OperationID: "listPoems",
		SpecJSON:    "{}",
	})
	if err != nil {
		t.Fatalf("failed to add default group endpoint: %v", err)
	}

	_, err = AddEndpoint(database, Endpoint{
		ServiceID:             serviceID,
		Method:                "POST",
		Path:                  "/admin/sync",
		OperationID:           "syncAdmin",
		SpecJSON:              "{}",
		EndpointGroupName:     "internal",
		EndpointGroupFilePath: "/tmp/openapi.internal.yml",
	})
	if err != nil {
		t.Fatalf("failed to add internal group endpoint: %v", err)
	}

	endpoints, err := GetEndpointsByService(database, serviceID)
	if err != nil {
		t.Fatalf("failed to load endpoints: %v", err)
	}
	if len(endpoints) != 2 {
		t.Fatalf("expected 2 endpoints, got %d", len(endpoints))
	}

	groupsByPath := map[string]string{}
	filesByPath := map[string]string{}
	for _, endpoint := range endpoints {
		groupsByPath[endpoint.Path] = endpoint.EndpointGroupName
		filesByPath[endpoint.Path] = endpoint.EndpointGroupFilePath
	}

	if groupsByPath["/poems"] != "public" {
		t.Fatalf("expected /poems to be in public group, got %q", groupsByPath["/poems"])
	}
	if groupsByPath["/admin/sync"] != "internal" {
		t.Fatalf("expected /admin/sync to be in internal group, got %q", groupsByPath["/admin/sync"])
	}
	if filesByPath["/admin/sync"] != "/tmp/openapi.internal.yml" {
		t.Fatalf("expected /admin/sync file path to be persisted, got %q", filesByPath["/admin/sync"])
	}
}

func TestAddEndpoint_AllowsSameMethodPathAcrossGroups(t *testing.T) {
	t.Parallel()

	database, err := InitDB(":memory:")
	if err != nil {
		t.Fatalf("failed to initialize database: %v", err)
	}
	defer database.Close()

	repoID, _ := AddRepository(database, Repository{Name: "poet-repo", Path: "/tmp/poets"})
	serviceID, _ := AddService(database, Service{RepoID: repoID, ServiceID: "dante", Name: "Dante", Port: 3000, ConfigJSON: "{}"})

	_, err = AddEndpoint(database, Endpoint{
		ServiceID:   serviceID,
		Method:      "GET",
		Path:        "/inferno",
		OperationID: "getInfernoPublic",
		SpecJSON:    "{}",
	})
	if err != nil {
		t.Fatalf("failed to add public endpoint: %v", err)
	}

	_, err = AddEndpoint(database, Endpoint{
		ServiceID:         serviceID,
		Method:            "GET",
		Path:              "/inferno",
		OperationID:       "getInfernoInternal",
		SpecJSON:          "{}",
		EndpointGroupName: "internal",
	})
	if err != nil {
		t.Fatalf("expected same method/path in different group to succeed, got: %v", err)
	}

	endpoints, err := GetEndpointsByService(database, serviceID)
	if err != nil {
		t.Fatalf("failed to read endpoints: %v", err)
	}
	if len(endpoints) != 2 {
		t.Fatalf("expected 2 endpoints, got %d", len(endpoints))
	}
}

func TestInitDB_MigratesLegacyEndpointsToPublicGroup(t *testing.T) {
	t.Parallel()

	dbPath := filepath.Join(t.TempDir(), "postwhale_legacy.db")
	legacyDB, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		t.Fatalf("failed to create legacy DB: %v", err)
	}

	legacySchema := `
CREATE TABLE repositories (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT NOT NULL,
	path TEXT NOT NULL UNIQUE,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE services (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	repo_id INTEGER NOT NULL,
	service_id TEXT NOT NULL,
	name TEXT NOT NULL,
	port INTEGER NOT NULL,
	config_json TEXT NOT NULL,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	UNIQUE(repo_id, service_id)
);

CREATE TABLE endpoints (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	service_id INTEGER NOT NULL,
	method TEXT NOT NULL,
	path TEXT NOT NULL,
	operation_id TEXT NOT NULL,
	spec_json TEXT NOT NULL,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	UNIQUE(service_id, method, path)
);

CREATE TABLE requests (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	endpoint_id INTEGER NOT NULL,
	environment TEXT NOT NULL,
	headers TEXT,
	body TEXT,
	response TEXT,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE saved_requests (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	endpoint_id INTEGER NOT NULL,
	name TEXT NOT NULL,
	path_params_json TEXT NOT NULL DEFAULT '{}',
	query_params_json TEXT NOT NULL DEFAULT '[]',
	headers_json TEXT NOT NULL DEFAULT '[]',
	body TEXT NOT NULL DEFAULT '',
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`

	if _, err := legacyDB.Exec(legacySchema); err != nil {
		t.Fatalf("failed to create legacy schema: %v", err)
	}
	if _, err := legacyDB.Exec("INSERT INTO repositories (id, name, path) VALUES (1, 'legacy-repo', '/tmp/legacy')"); err != nil {
		t.Fatalf("failed to insert repository: %v", err)
	}
	if _, err := legacyDB.Exec("INSERT INTO services (id, repo_id, service_id, name, port, config_json) VALUES (1, 1, 'legacy', 'Legacy', 8080, '{}')"); err != nil {
		t.Fatalf("failed to insert service: %v", err)
	}
	if _, err := legacyDB.Exec("INSERT INTO endpoints (id, service_id, method, path, operation_id, spec_json) VALUES (1, 1, 'GET', '/legacy', 'getLegacy', '{}')"); err != nil {
		t.Fatalf("failed to insert endpoint: %v", err)
	}
	if err := legacyDB.Close(); err != nil {
		t.Fatalf("failed to close legacy DB: %v", err)
	}

	database, err := InitDB(dbPath)
	if err != nil {
		t.Fatalf("failed to initialize migrated DB: %v", err)
	}
	defer database.Close()
	defer os.Remove(dbPath)

	endpoints, err := GetEndpointsByService(database, 1)
	if err != nil {
		t.Fatalf("failed to read migrated endpoints: %v", err)
	}
	if len(endpoints) != 1 {
		t.Fatalf("expected 1 migrated endpoint, got %d", len(endpoints))
	}
	if endpoints[0].EndpointGroupName != "public" {
		t.Fatalf("expected migrated endpoint group public, got %q", endpoints[0].EndpointGroupName)
	}
}
