package ipc

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"path/filepath"

	"github.com/triplewhale/postwhale/db"
	"github.com/triplewhale/postwhale/scanner"
)

// IPCRequest represents an incoming IPC message
type IPCRequest struct {
	Action string          `json:"action"`
	Data   json.RawMessage `json:"data"`
}

// IPCResponse represents an outgoing IPC message
type IPCResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// Handler manages IPC requests and database operations
type Handler struct {
	database *sql.DB
}

// NewHandler creates a new IPC handler with the specified database path
func NewHandler(dbPath string) *Handler {
	database, err := db.InitDB(dbPath)
	if err != nil {
		// For testing with :memory:, this should not fail
		panic(fmt.Sprintf("failed to initialize database: %v", err))
	}

	return &Handler{
		database: database,
	}
}

// Close closes the database connection
func (h *Handler) Close() error {
	return h.database.Close()
}

// HandleRequest processes an IPC request and returns a response
func (h *Handler) HandleRequest(request IPCRequest) IPCResponse {
	switch request.Action {
	case "addRepository":
		return h.handleAddRepository(request.Data)
	case "getRepositories":
		return h.handleGetRepositories()
	case "removeRepository":
		return h.handleRemoveRepository(request.Data)
	case "getServices":
		return h.handleGetServices(request.Data)
	case "getEndpoints":
		return h.handleGetEndpoints(request.Data)
	case "executeRequest":
		return h.handleExecuteRequest(request.Data)
	case "getRequestHistory":
		return h.handleGetRequestHistory(request.Data)
	default:
		return IPCResponse{
			Success: false,
			Error:   fmt.Sprintf("unknown action: %s", request.Action),
		}
	}
}

// handleAddRepository adds a repository and scans it for services
func (h *Handler) handleAddRepository(data json.RawMessage) IPCResponse {
	var input struct {
		Path string `json:"path"`
	}

	if err := json.Unmarshal(data, &input); err != nil {
		return IPCResponse{
			Success: false,
			Error:   fmt.Sprintf("invalid request data: %v", err),
		}
	}

	// Convert to absolute path
	absPath, err := filepath.Abs(input.Path)
	if err != nil {
		return IPCResponse{
			Success: false,
			Error:   fmt.Sprintf("invalid path: %v", err),
		}
	}

	// Scan repository for services
	scanResult := scanner.ScanRepository(absPath)
	if len(scanResult.Errors) > 0 {
		return IPCResponse{
			Success: false,
			Error:   fmt.Sprintf("scan failed: %s", scanResult.Errors[0]),
		}
	}

	// Add repository to database (use path as name for now)
	repoID, err := db.AddRepository(h.database, db.Repository{
		Name: filepath.Base(absPath),
		Path: absPath,
	})
	if err != nil {
		return IPCResponse{
			Success: false,
			Error:   fmt.Sprintf("failed to add repository: %v", err),
		}
	}

	// Add discovered services to database
	for _, svc := range scanResult.Services {
		serviceID, err := db.AddService(h.database, db.Service{
			RepoID:     repoID,
			ServiceID:  svc.ServiceID,
			Name:       svc.Name,
			Port:       svc.Port,
			ConfigJSON: "{}",
		})
		if err != nil {
			return IPCResponse{
				Success: false,
				Error:   fmt.Sprintf("failed to add service %s: %v", svc.ServiceID, err),
			}
		}

		// Add endpoints for this service
		for _, endpoint := range svc.Endpoints {
			_, err := db.AddEndpoint(h.database, db.Endpoint{
				ServiceID:   serviceID,
				Method:      endpoint.Method,
				Path:        endpoint.Path,
				OperationID: endpoint.OperationID,
				SpecJSON:    "{}",
			})
			if err != nil {
				return IPCResponse{
					Success: false,
					Error:   fmt.Sprintf("failed to add endpoint %s: %v", endpoint.Path, err),
				}
			}
		}
	}

	// Return repository info
	repo, err := db.GetRepositories(h.database)
	if err != nil || len(repo) == 0 {
		return IPCResponse{
			Success: false,
			Error:   "failed to retrieve added repository",
		}
	}

	// Find the repository we just added
	var addedRepo *db.Repository
	for i := range repo {
		if repo[i].ID == repoID {
			addedRepo = &repo[i]
			break
		}
	}

	return IPCResponse{
		Success: true,
		Data: map[string]interface{}{
			"id":   addedRepo.ID,
			"path": addedRepo.Path,
		},
	}
}

// handleGetRepositories retrieves all repositories
func (h *Handler) handleGetRepositories() IPCResponse {
	repos, err := db.GetRepositories(h.database)
	if err != nil {
		return IPCResponse{
			Success: false,
			Error:   fmt.Sprintf("failed to get repositories: %v", err),
		}
	}

	// Convert to interface{} slice for JSON marshaling
	result := make([]interface{}, len(repos))
	for i, repo := range repos {
		result[i] = map[string]interface{}{
			"id":   repo.ID,
			"path": repo.Path,
		}
	}

	return IPCResponse{
		Success: true,
		Data:    result,
	}
}

// handleRemoveRepository removes a repository and all related data
func (h *Handler) handleRemoveRepository(data json.RawMessage) IPCResponse {
	var input struct {
		ID int64 `json:"id"`
	}

	if err := json.Unmarshal(data, &input); err != nil {
		return IPCResponse{
			Success: false,
			Error:   fmt.Sprintf("invalid request data: %v", err),
		}
	}

	// Delete repository (CASCADE will handle services, endpoints, requests)
	_, err := h.database.Exec("DELETE FROM repositories WHERE id = ?", input.ID)
	if err != nil {
		return IPCResponse{
			Success: false,
			Error:   fmt.Sprintf("failed to remove repository: %v", err),
		}
	}

	return IPCResponse{
		Success: true,
		Data:    map[string]interface{}{"removed": true},
	}
}

// handleGetServices retrieves services for a repository
func (h *Handler) handleGetServices(data json.RawMessage) IPCResponse {
	var input struct {
		RepositoryID int64 `json:"repositoryId"`
	}

	if err := json.Unmarshal(data, &input); err != nil {
		return IPCResponse{
			Success: false,
			Error:   fmt.Sprintf("invalid request data: %v", err),
		}
	}

	services, err := db.GetServicesByRepo(h.database, input.RepositoryID)
	if err != nil {
		return IPCResponse{
			Success: false,
			Error:   fmt.Sprintf("failed to get services: %v", err),
		}
	}

	// Convert to interface{} slice
	result := make([]interface{}, len(services))
	for i, svc := range services {
		result[i] = map[string]interface{}{
			"id":        svc.ID,
			"serviceId": svc.ServiceID,
			"name":      svc.Name,
			"port":      svc.Port,
		}
	}

	return IPCResponse{
		Success: true,
		Data:    result,
	}
}

// handleGetEndpoints retrieves endpoints for a service
func (h *Handler) handleGetEndpoints(data json.RawMessage) IPCResponse {
	var input struct {
		ServiceID int64 `json:"serviceId"`
	}

	if err := json.Unmarshal(data, &input); err != nil {
		return IPCResponse{
			Success: false,
			Error:   fmt.Sprintf("invalid request data: %v", err),
		}
	}

	endpoints, err := db.GetEndpointsByService(h.database, input.ServiceID)
	if err != nil {
		return IPCResponse{
			Success: false,
			Error:   fmt.Sprintf("failed to get endpoints: %v", err),
		}
	}

	// Convert to interface{} slice
	result := make([]interface{}, len(endpoints))
	for i, ep := range endpoints {
		result[i] = map[string]interface{}{
			"id":          ep.ID,
			"operationId": ep.OperationID,
			"method":      ep.Method,
			"path":        ep.Path,
		}
	}

	return IPCResponse{
		Success: true,
		Data:    result,
	}
}

// handleExecuteRequest executes an HTTP request
func (h *Handler) handleExecuteRequest(data json.RawMessage) IPCResponse {
	// TODO: Implement executeRequest action
	return IPCResponse{
		Success: false,
		Error:   "executeRequest not yet implemented",
	}
}

// handleGetRequestHistory retrieves request history
func (h *Handler) handleGetRequestHistory(data json.RawMessage) IPCResponse {
	var input struct {
		EndpointID int64 `json:"endpointId"`
		Limit      int   `json:"limit"`
	}

	if err := json.Unmarshal(data, &input); err != nil {
		return IPCResponse{
			Success: false,
			Error:   fmt.Sprintf("invalid request data: %v", err),
		}
	}

	// Default limit if not specified
	if input.Limit == 0 {
		input.Limit = 50
	}

	history, err := db.GetRequestHistory(h.database, input.EndpointID, input.Limit)
	if err != nil {
		return IPCResponse{
			Success: false,
			Error:   fmt.Sprintf("failed to get request history: %v", err),
		}
	}

	// Convert to interface{} slice
	result := make([]interface{}, len(history))
	for i, req := range history {
		result[i] = map[string]interface{}{
			"id":          req.ID,
			"endpointId":  req.EndpointID,
			"environment": req.Environment,
			"headers":     req.Headers,
			"body":        req.Body,
			"response":    req.Response,
			"createdAt":   req.CreatedAt,
		}
	}

	return IPCResponse{
		Success: true,
		Data:    result,
	}
}
