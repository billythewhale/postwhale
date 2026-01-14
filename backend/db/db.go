package db

import (
	"database/sql"
	"fmt"
	"path/filepath"
	"strings"

	_ "github.com/mattn/go-sqlite3"
)

// Repository represents a repository in the database
type Repository struct {
	ID   int64
	Name string
	Path string
}

// Service represents a service in the database
type Service struct {
	ID         int64
	RepoID     int64
	ServiceID  string
	Name       string
	Port       int
	ConfigJSON string
}

// Endpoint represents an endpoint in the database
type Endpoint struct {
	ID          int64
	ServiceID   int64
	Method      string
	Path        string
	OperationID string
	SpecJSON    string
}

// Request represents a saved request in the database
type Request struct {
	ID          int64
	EndpointID  int64
	Environment string
	Headers     string
	Body        string
	Response    string
	CreatedAt   string
}

// SavedRequest represents a user-saved request configuration
type SavedRequest struct {
	ID              int64
	EndpointID      int64
	Name            string
	PathParamsJSON  string
	QueryParamsJSON string
	HeadersJSON     string
	Body            string
	CreatedAt       string
}

// InitDB initializes the SQLite database and creates tables
func InitDB(dbPath string) (*sql.DB, error) {
	// Validate and sanitize database path
	if dbPath == "" {
		return nil, fmt.Errorf("database path cannot be empty")
	}

	// Prevent path traversal by checking for suspicious patterns
	cleanPath := filepath.Clean(dbPath)
	if strings.Contains(cleanPath, "..") {
		return nil, fmt.Errorf("invalid database path: path traversal not allowed")
	}

	db, err := sql.Open("sqlite3", cleanPath)
	if err != nil {
		return nil, err
	}

	// Verify connection works
	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Create tables
	schema := `
	CREATE TABLE IF NOT EXISTS repositories (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		path TEXT NOT NULL UNIQUE,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS services (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		repo_id INTEGER NOT NULL,
		service_id TEXT NOT NULL,
		name TEXT NOT NULL,
		port INTEGER NOT NULL,
		config_json TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (repo_id) REFERENCES repositories(id) ON DELETE CASCADE,
		UNIQUE(repo_id, service_id)
	);

	CREATE TABLE IF NOT EXISTS endpoints (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		service_id INTEGER NOT NULL,
		method TEXT NOT NULL,
		path TEXT NOT NULL,
		operation_id TEXT NOT NULL,
		spec_json TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
		UNIQUE(service_id, method, path)
	);

	CREATE TABLE IF NOT EXISTS requests (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		endpoint_id INTEGER NOT NULL,
		environment TEXT NOT NULL,
		headers TEXT,
		body TEXT,
		response TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (endpoint_id) REFERENCES endpoints(id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS saved_requests (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		endpoint_id INTEGER NOT NULL,
		name TEXT NOT NULL,
		path_params_json TEXT NOT NULL DEFAULT '{}',
		query_params_json TEXT NOT NULL DEFAULT '[]',
		headers_json TEXT NOT NULL DEFAULT '[]',
		body TEXT NOT NULL DEFAULT '',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (endpoint_id) REFERENCES endpoints(id) ON DELETE CASCADE
	);
	`

	_, err = db.Exec(schema)
	if err != nil {
		db.Close()
		return nil, err
	}

	return db, nil
}

// AddRepository adds a new repository to the database
func AddRepository(db *sql.DB, repo Repository) (int64, error) {
	// Validate inputs
	if repo.Name == "" {
		return 0, fmt.Errorf("repository name cannot be empty")
	}
	if repo.Path == "" {
		return 0, fmt.Errorf("repository path cannot be empty")
	}

	result, err := db.Exec(
		"INSERT INTO repositories (name, path) VALUES (?, ?)",
		repo.Name, repo.Path,
	)
	if err != nil {
		return 0, err
	}

	return result.LastInsertId()
}

// GetRepositories retrieves all repositories from the database
func GetRepositories(db *sql.DB) ([]Repository, error) {
	rows, err := db.Query("SELECT id, name, path FROM repositories ORDER BY created_at DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// Initialize as empty slice, not nil
	repositories := []Repository{}
	for rows.Next() {
		var repo Repository
		if err := rows.Scan(&repo.ID, &repo.Name, &repo.Path); err != nil {
			return nil, err
		}
		repositories = append(repositories, repo)
	}

	// Check for errors during iteration
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return repositories, nil
}

// AddService adds a new service to the database
func AddService(db *sql.DB, service Service) (int64, error) {
	// Validate inputs
	if service.ServiceID == "" {
		return 0, fmt.Errorf("service_id cannot be empty")
	}
	if service.Name == "" {
		return 0, fmt.Errorf("service name cannot be empty")
	}
	if service.Port < 0 || service.Port > 65535 {
		return 0, fmt.Errorf("port must be between 0 and 65535")
	}

	result, err := db.Exec(
		"INSERT INTO services (repo_id, service_id, name, port, config_json) VALUES (?, ?, ?, ?, ?)",
		service.RepoID, service.ServiceID, service.Name, service.Port, service.ConfigJSON,
	)
	if err != nil {
		return 0, err
	}

	return result.LastInsertId()
}

// GetServicesByRepo retrieves all services for a repository
func GetServicesByRepo(db *sql.DB, repoID int64) ([]Service, error) {
	rows, err := db.Query(
		"SELECT id, repo_id, service_id, name, port, config_json FROM services WHERE repo_id = ? ORDER BY name",
		repoID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// Initialize as empty slice, not nil
	services := []Service{}
	for rows.Next() {
		var svc Service
		if err := rows.Scan(&svc.ID, &svc.RepoID, &svc.ServiceID, &svc.Name, &svc.Port, &svc.ConfigJSON); err != nil {
			return nil, err
		}
		services = append(services, svc)
	}

	// Check for errors during iteration
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return services, nil
}

// AddEndpoint adds a new endpoint to the database
func AddEndpoint(db *sql.DB, endpoint Endpoint) (int64, error) {
	// Validate inputs
	if endpoint.Method == "" {
		return 0, fmt.Errorf("endpoint method cannot be empty")
	}
	if endpoint.Path == "" {
		return 0, fmt.Errorf("endpoint path cannot be empty")
	}

	// Validate HTTP method
	validMethods := map[string]bool{
		"GET":     true,
		"POST":    true,
		"PUT":     true,
		"PATCH":   true,
		"DELETE":  true,
		"HEAD":    true,
		"OPTIONS": true,
	}
	if !validMethods[strings.ToUpper(endpoint.Method)] {
		return 0, fmt.Errorf("invalid HTTP method: %s", endpoint.Method)
	}

	result, err := db.Exec(
		"INSERT INTO endpoints (service_id, method, path, operation_id, spec_json) VALUES (?, ?, ?, ?, ?)",
		endpoint.ServiceID, endpoint.Method, endpoint.Path, endpoint.OperationID, endpoint.SpecJSON,
	)
	if err != nil {
		return 0, err
	}

	return result.LastInsertId()
}

// GetEndpointsByService retrieves all endpoints for a service
func GetEndpointsByService(db *sql.DB, serviceID int64) ([]Endpoint, error) {
	rows, err := db.Query(
		"SELECT id, service_id, method, path, operation_id, spec_json FROM endpoints WHERE service_id = ? ORDER BY path, method",
		serviceID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// Initialize as empty slice, not nil
	endpoints := []Endpoint{}
	for rows.Next() {
		var ep Endpoint
		if err := rows.Scan(&ep.ID, &ep.ServiceID, &ep.Method, &ep.Path, &ep.OperationID, &ep.SpecJSON); err != nil {
			return nil, err
		}
		endpoints = append(endpoints, ep)
	}

	// Check for errors during iteration
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return endpoints, nil
}

// AddRequest adds a new request to the database
func AddRequest(db *sql.DB, request Request) (int64, error) {
	// Validate inputs
	if request.Environment == "" {
		return 0, fmt.Errorf("environment cannot be empty")
	}

	result, err := db.Exec(
		"INSERT INTO requests (endpoint_id, environment, headers, body, response) VALUES (?, ?, ?, ?, ?)",
		request.EndpointID, request.Environment, request.Headers, request.Body, request.Response,
	)
	if err != nil {
		return 0, err
	}

	return result.LastInsertId()
}

// GetRequestHistory retrieves request history for an endpoint
func GetRequestHistory(db *sql.DB, endpointID int64, limit int) ([]Request, error) {
	rows, err := db.Query(
		`SELECT id, endpoint_id, environment, headers, body, response, created_at
		FROM requests
		WHERE endpoint_id = ?
		ORDER BY created_at DESC
		LIMIT ?`,
		endpointID, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// Initialize as empty slice, not nil
	requests := []Request{}
	for rows.Next() {
		var req Request
		if err := rows.Scan(&req.ID, &req.EndpointID, &req.Environment, &req.Headers, &req.Body, &req.Response, &req.CreatedAt); err != nil {
			return nil, err
		}
		requests = append(requests, req)
	}

	// Check for errors during iteration
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return requests, nil
}

// AddSavedRequest adds a new saved request to the database
func AddSavedRequest(db *sql.DB, savedRequest SavedRequest) (int64, error) {
	// Validate inputs
	if savedRequest.Name == "" {
		return 0, fmt.Errorf("saved request name cannot be empty")
	}
	if savedRequest.EndpointID == 0 {
		return 0, fmt.Errorf("endpoint_id cannot be empty")
	}

	result, err := db.Exec(
		"INSERT INTO saved_requests (endpoint_id, name, path_params_json, query_params_json, headers_json, body) VALUES (?, ?, ?, ?, ?, ?)",
		savedRequest.EndpointID, savedRequest.Name, savedRequest.PathParamsJSON, savedRequest.QueryParamsJSON, savedRequest.HeadersJSON, savedRequest.Body,
	)
	if err != nil {
		return 0, err
	}

	return result.LastInsertId()
}

// GetSavedRequestsByEndpoint retrieves all saved requests for an endpoint
func GetSavedRequestsByEndpoint(db *sql.DB, endpointID int64) ([]SavedRequest, error) {
	rows, err := db.Query(
		`SELECT id, endpoint_id, name, path_params_json, query_params_json, headers_json, body, created_at
		FROM saved_requests
		WHERE endpoint_id = ?
		ORDER BY created_at DESC`,
		endpointID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// Initialize as empty slice, not nil
	savedRequests := []SavedRequest{}
	for rows.Next() {
		var req SavedRequest
		if err := rows.Scan(&req.ID, &req.EndpointID, &req.Name, &req.PathParamsJSON, &req.QueryParamsJSON, &req.HeadersJSON, &req.Body, &req.CreatedAt); err != nil {
			return nil, err
		}
		savedRequests = append(savedRequests, req)
	}

	// Check for errors during iteration
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return savedRequests, nil
}

// UpdateSavedRequest updates an existing saved request
func UpdateSavedRequest(db *sql.DB, savedRequest SavedRequest) error {
	// Validate inputs
	if savedRequest.ID == 0 {
		return fmt.Errorf("saved request id cannot be empty")
	}
	if savedRequest.Name == "" {
		return fmt.Errorf("saved request name cannot be empty")
	}

	_, err := db.Exec(
		"UPDATE saved_requests SET name = ?, path_params_json = ?, query_params_json = ?, headers_json = ?, body = ? WHERE id = ?",
		savedRequest.Name, savedRequest.PathParamsJSON, savedRequest.QueryParamsJSON, savedRequest.HeadersJSON, savedRequest.Body, savedRequest.ID,
	)
	return err
}

// DeleteSavedRequest deletes a saved request from the database
func DeleteSavedRequest(db *sql.DB, id int64) error {
	if id == 0 {
		return fmt.Errorf("saved request id cannot be empty")
	}

	_, err := db.Exec("DELETE FROM saved_requests WHERE id = ?", id)
	return err
}
