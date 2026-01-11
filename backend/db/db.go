package db

import (
	"database/sql"

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

// InitDB initializes the SQLite database and creates tables
func InitDB(dbPath string) (*sql.DB, error) {
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, err
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
	`

	_, err = db.Exec(schema)
	if err != nil {
		return nil, err
	}

	return db, nil
}

// AddRepository adds a new repository to the database
func AddRepository(db *sql.DB, repo Repository) (int64, error) {
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

	var repositories []Repository
	for rows.Next() {
		var repo Repository
		if err := rows.Scan(&repo.ID, &repo.Name, &repo.Path); err != nil {
			return nil, err
		}
		repositories = append(repositories, repo)
	}

	return repositories, nil
}

// AddService adds a new service to the database
func AddService(db *sql.DB, service Service) (int64, error) {
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

	var services []Service
	for rows.Next() {
		var svc Service
		if err := rows.Scan(&svc.ID, &svc.RepoID, &svc.ServiceID, &svc.Name, &svc.Port, &svc.ConfigJSON); err != nil {
			return nil, err
		}
		services = append(services, svc)
	}

	return services, nil
}

// AddEndpoint adds a new endpoint to the database
func AddEndpoint(db *sql.DB, endpoint Endpoint) (int64, error) {
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

	var endpoints []Endpoint
	for rows.Next() {
		var ep Endpoint
		if err := rows.Scan(&ep.ID, &ep.ServiceID, &ep.Method, &ep.Path, &ep.OperationID, &ep.SpecJSON); err != nil {
			return nil, err
		}
		endpoints = append(endpoints, ep)
	}

	return endpoints, nil
}

// AddRequest adds a new request to the database
func AddRequest(db *sql.DB, request Request) (int64, error) {
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

	var requests []Request
	for rows.Next() {
		var req Request
		if err := rows.Scan(&req.ID, &req.EndpointID, &req.Environment, &req.Headers, &req.Body, &req.Response, &req.CreatedAt); err != nil {
			return nil, err
		}
		requests = append(requests, req)
	}

	return requests, nil
}
