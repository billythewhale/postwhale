package ipc

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/triplewhale/postwhale/client"
	"github.com/triplewhale/postwhale/db"
	"github.com/triplewhale/postwhale/scanner"
)

// IPCRequest represents an incoming IPC message
type IPCRequest struct {
	Action    string          `json:"action"`
	Data      json.RawMessage `json:"data"`
	RequestID interface{}     `json:"requestId,omitempty"`
}

// IPCResponse represents an outgoing IPC message
type IPCResponse struct {
	Success   bool        `json:"success"`
	Data      interface{} `json:"data,omitempty"`
	Error     string      `json:"error,omitempty"`
	RequestID interface{} `json:"requestId,omitempty"`
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
	var response IPCResponse

	switch request.Action {
	case "addRepository":
		response = h.handleAddRepository(request.Data)
	case "getRepositories":
		response = h.handleGetRepositories()
	case "removeRepository":
		response = h.handleRemoveRepository(request.Data)
	case "getServices":
		response = h.handleGetServices(request.Data)
	case "getEndpoints":
		response = h.handleGetEndpoints(request.Data)
	case "executeRequest":
		response = h.handleExecuteRequest(request.Data)
	case "getRequestHistory":
		response = h.handleGetRequestHistory(request.Data)
	case "scanDirectory":
		response = h.handleScanDirectory(request.Data)
	case "checkPath":
		response = h.handleCheckPath(request.Data)
	case "refreshRepository":
		response = h.handleRefreshRepository(request.Data)
	case "saveSavedRequest":
		response = h.handleSaveSavedRequest(request.Data)
	case "getSavedRequests":
		response = h.handleGetSavedRequests(request.Data)
	case "updateSavedRequest":
		response = h.handleUpdateSavedRequest(request.Data)
	case "deleteSavedRequest":
		response = h.handleDeleteSavedRequest(request.Data)
	default:
		response = IPCResponse{
			Success: false,
			Error:   fmt.Sprintf("unknown action: %s", request.Action),
		}
	}

	// Pass through requestId for correlation
	response.RequestID = request.RequestID
	return response
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
			"name": addedRepo.Name,
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
			"name": repo.Name,
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
			"repoId":    svc.RepoID,
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
			"serviceId":   ep.ServiceID,
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
	var input struct {
		ServiceID   string            `json:"serviceId"`
		Port        int               `json:"port"`
		Endpoint    string            `json:"endpoint"`
		Method      string            `json:"method"`
		Environment string            `json:"environment"`
		Headers     map[string]string `json:"headers"`
		Body        string            `json:"body"`
		EndpointID  int64             `json:"endpointId,omitempty"`
	}

	if err := json.Unmarshal(data, &input); err != nil {
		return IPCResponse{
			Success: false,
			Error:   fmt.Sprintf("invalid request data: %v", err),
		}
	}

	// Build client config
	config := client.RequestConfig{
		ServiceID:   input.ServiceID,
		Port:        input.Port,
		Endpoint:    input.Endpoint,
		Method:      input.Method,
		Environment: client.Environment(input.Environment),
		Headers:     input.Headers,
		Body:        input.Body,
		Timeout:     30 * time.Second,
	}

	// Execute the HTTP request
	response := client.ExecuteRequest(config)

	// Convert response to map for JSON serialization
	result := map[string]interface{}{
		"statusCode":   response.StatusCode,
		"status":       response.Status,
		"headers":      response.Headers,
		"body":         response.Body,
		"responseTime": response.ResponseTime.Milliseconds(),
	}

	// Include error if present
	if response.Error != "" {
		result["error"] = response.Error
	}

	// Save to request history if endpointId provided
	if input.EndpointID > 0 {
		headersJSON, _ := json.Marshal(input.Headers)
		responseJSON, _ := json.Marshal(result)

		_, _ = db.AddRequest(h.database, db.Request{
			EndpointID:  input.EndpointID,
			Environment: input.Environment,
			Headers:     string(headersJSON),
			Body:        input.Body,
			Response:    string(responseJSON),
		})
	}

	return IPCResponse{
		Success: true,
		Data:    result,
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

// handleScanDirectory lists subdirectories of a path
func (h *Handler) handleScanDirectory(data json.RawMessage) IPCResponse {
	var input struct {
		Path string `json:"path"`
	}
	if err := json.Unmarshal(data, &input); err != nil {
		return IPCResponse{Success: false, Error: fmt.Sprintf("invalid request data: %v", err)}
	}

	// Check for path traversal BEFORE any processing
	if strings.Contains(input.Path, "..") {
		return IPCResponse{Success: false, Error: "invalid path: path traversal not allowed"}
	}

	// Expand ~ to home directory
	path := input.Path
	if path == "" || path == "~" {
		home, err := os.UserHomeDir()
		if err != nil {
			return IPCResponse{Success: false, Error: fmt.Sprintf("failed to get home directory: %v", err)}
		}
		path = home
	} else if len(path) > 0 && path[0] == '~' {
		home, err := os.UserHomeDir()
		if err != nil {
			return IPCResponse{Success: false, Error: fmt.Sprintf("failed to get home directory: %v", err)}
		}
		path = filepath.Join(home, path[1:])
	}

	// Clean the path
	path = filepath.Clean(path)

	// Check if path exists
	info, err := os.Stat(path)
	if err != nil {
		return IPCResponse{Success: false, Error: fmt.Sprintf("path not found: %s", path)}
	}
	if !info.IsDir() {
		return IPCResponse{Success: false, Error: "path is not a directory"}
	}

	// List subdirectories
	entries, err := os.ReadDir(path)
	if err != nil {
		return IPCResponse{Success: false, Error: fmt.Sprintf("failed to read directory: %v", err)}
	}

	subdirs := []map[string]interface{}{}
	for _, entry := range entries {
		if entry.IsDir() && !strings.HasPrefix(entry.Name(), ".") {
			subPath := filepath.Join(path, entry.Name())
			// Check if it has a services directory (valid TW repo)
			servicesPath := filepath.Join(subPath, "services")
			hasServices := false
			if info, err := os.Stat(servicesPath); err == nil && info.IsDir() {
				hasServices = true
			}
			subdirs = append(subdirs, map[string]interface{}{
				"name":        entry.Name(),
				"path":        subPath,
				"hasServices": hasServices,
			})
		}
	}

	return IPCResponse{
		Success: true,
		Data: map[string]interface{}{
			"basePath": path,
			"subdirs":  subdirs,
		},
	}
}

// handleCheckPath checks if a path exists
func (h *Handler) handleCheckPath(data json.RawMessage) IPCResponse {
	var input struct {
		Path string `json:"path"`
	}
	if err := json.Unmarshal(data, &input); err != nil {
		return IPCResponse{Success: false, Error: fmt.Sprintf("invalid request data: %v", err)}
	}

	// Check for path traversal BEFORE any processing
	if strings.Contains(input.Path, "..") {
		return IPCResponse{Success: false, Error: "invalid path: path traversal not allowed"}
	}

	// Expand ~ to home directory
	path := input.Path
	if len(path) > 0 && path[0] == '~' {
		home, err := os.UserHomeDir()
		if err != nil {
			return IPCResponse{Success: false, Error: fmt.Sprintf("failed to get home directory: %v", err)}
		}
		path = filepath.Join(home, path[1:])
	}

	// Clean the path
	path = filepath.Clean(path)

	info, err := os.Stat(path)
	exists := err == nil
	isDir := exists && info.IsDir()

	return IPCResponse{
		Success: true,
		Data: map[string]interface{}{
			"exists":       exists,
			"isDirectory":  isDir,
			"resolvedPath": path,
		},
	}
}

// handleRefreshRepository re-scans a repository to update services and endpoints
func (h *Handler) handleRefreshRepository(data json.RawMessage) IPCResponse {
	var input struct {
		ID int64 `json:"id"`
	}

	if err := json.Unmarshal(data, &input); err != nil {
		return IPCResponse{
			Success: false,
			Error:   fmt.Sprintf("invalid request data: %v", err),
		}
	}

	// Get the repository from database
	repos, err := db.GetRepositories(h.database)
	if err != nil {
		return IPCResponse{
			Success: false,
			Error:   fmt.Sprintf("failed to get repositories: %v", err),
		}
	}

	var repo *db.Repository
	for i := range repos {
		if repos[i].ID == input.ID {
			repo = &repos[i]
			break
		}
	}

	if repo == nil {
		return IPCResponse{
			Success: false,
			Error:   fmt.Sprintf("repository not found: %d", input.ID),
		}
	}

	// Re-scan the repository
	scanResult := scanner.ScanRepository(repo.Path)
	if len(scanResult.Errors) > 0 && len(scanResult.Services) == 0 {
		return IPCResponse{
			Success: false,
			Error:   fmt.Sprintf("scan failed: %s", scanResult.Errors[0]),
		}
	}

	// Get existing services for this repo to track what to remove
	existingServices, err := db.GetServicesByRepo(h.database, input.ID)
	if err != nil {
		return IPCResponse{
			Success: false,
			Error:   fmt.Sprintf("failed to get existing services: %v", err),
		}
	}

	// Track which services still exist after scan
	scannedServiceIDs := make(map[string]bool)
	for _, svc := range scanResult.Services {
		scannedServiceIDs[svc.ServiceID] = true
	}

	// Remove services that no longer exist in the repository
	for _, existingSvc := range existingServices {
		if !scannedServiceIDs[existingSvc.ServiceID] {
			_, _ = h.database.Exec("DELETE FROM services WHERE id = ?", existingSvc.ID)
		}
	}

	// Upsert discovered services to database (preserves IDs via unique constraint)
	servicesAdded := 0
	endpointsAdded := 0
	for _, svc := range scanResult.Services {
		// Use INSERT OR REPLACE to preserve IDs when service already exists
		result, err := h.database.Exec(`
			INSERT INTO services (repo_id, service_id, name, port, config_json)
			VALUES (?, ?, ?, ?, ?)
			ON CONFLICT(repo_id, service_id) DO UPDATE SET
				name = excluded.name,
				port = excluded.port,
				config_json = excluded.config_json
		`, input.ID, svc.ServiceID, svc.Name, svc.Port, "{}")
		if err != nil {
			continue // Skip services that fail to add
		}

		// Get the service ID (either newly inserted or existing)
		serviceID, err := result.LastInsertId()
		if err != nil {
			// If LastInsertId fails (happens on UPDATE), find the service by unique key
			rows, err := h.database.Query("SELECT id FROM services WHERE repo_id = ? AND service_id = ?", input.ID, svc.ServiceID)
			if err != nil {
				continue
			}
			if rows.Next() {
				rows.Scan(&serviceID)
			}
			rows.Close()
		}
		servicesAdded++

		// Get existing endpoints for this service to track what to remove
		existingEndpoints, err := db.GetEndpointsByService(h.database, serviceID)
		if err != nil {
			continue
		}

		// Track which endpoints still exist after scan
		scannedEndpoints := make(map[string]bool)
		for _, endpoint := range svc.Endpoints {
			key := endpoint.Method + ":" + endpoint.Path
			scannedEndpoints[key] = true
		}

		// Remove endpoints that no longer exist for this service
		for _, existingEp := range existingEndpoints {
			key := existingEp.Method + ":" + existingEp.Path
			if !scannedEndpoints[key] {
				_, _ = h.database.Exec("DELETE FROM endpoints WHERE id = ?", existingEp.ID)
			}
		}

		// Upsert endpoints for this service (preserves IDs via unique constraint)
		for _, endpoint := range svc.Endpoints {
			_, err := h.database.Exec(`
				INSERT INTO endpoints (service_id, method, path, operation_id, spec_json)
				VALUES (?, ?, ?, ?, ?)
				ON CONFLICT(service_id, method, path) DO UPDATE SET
					operation_id = excluded.operation_id,
					spec_json = excluded.spec_json
			`, serviceID, endpoint.Method, endpoint.Path, endpoint.OperationID, "{}")
			if err == nil {
				endpointsAdded++
			}
		}
	}

	return IPCResponse{
		Success: true,
		Data: map[string]interface{}{
			"id":             repo.ID,
			"name":           repo.Name,
			"path":           repo.Path,
			"servicesAdded":  servicesAdded,
			"endpointsAdded": endpointsAdded,
			"warnings":       scanResult.Errors,
		},
	}
}

// handleSaveSavedRequest saves a new saved request configuration
func (h *Handler) handleSaveSavedRequest(data json.RawMessage) IPCResponse {
	var input struct {
		EndpointID      int64  `json:"endpointId"`
		Name            string `json:"name"`
		PathParamsJSON  string `json:"pathParamsJson"`
		QueryParamsJSON string `json:"queryParamsJson"`
		HeadersJSON     string `json:"headersJson"`
		Body            string `json:"body"`
	}

	if err := json.Unmarshal(data, &input); err != nil {
		return IPCResponse{
			Success: false,
			Error:   fmt.Sprintf("invalid request data: %v", err),
		}
	}

	savedRequest := db.SavedRequest{
		EndpointID:      input.EndpointID,
		Name:            input.Name,
		PathParamsJSON:  input.PathParamsJSON,
		QueryParamsJSON: input.QueryParamsJSON,
		HeadersJSON:     input.HeadersJSON,
		Body:            input.Body,
	}

	id, err := db.AddSavedRequest(h.database, savedRequest)
	if err != nil {
		return IPCResponse{
			Success: false,
			Error:   fmt.Sprintf("failed to save request: %v", err),
		}
	}

	return IPCResponse{
		Success: true,
		Data: map[string]interface{}{
			"id":              id,
			"endpointId":      input.EndpointID,
			"name":            input.Name,
			"pathParamsJson":  input.PathParamsJSON,
			"queryParamsJson": input.QueryParamsJSON,
			"headersJson":     input.HeadersJSON,
			"body":            input.Body,
		},
	}
}

// handleGetSavedRequests retrieves saved requests for an endpoint
func (h *Handler) handleGetSavedRequests(data json.RawMessage) IPCResponse {
	var input struct {
		EndpointID int64 `json:"endpointId"`
	}

	if err := json.Unmarshal(data, &input); err != nil {
		return IPCResponse{
			Success: false,
			Error:   fmt.Sprintf("invalid request data: %v", err),
		}
	}

	savedRequests, err := db.GetSavedRequestsByEndpoint(h.database, input.EndpointID)
	if err != nil {
		return IPCResponse{
			Success: false,
			Error:   fmt.Sprintf("failed to get saved requests: %v", err),
		}
	}

	// Convert to interface{} slice
	result := make([]interface{}, len(savedRequests))
	for i, req := range savedRequests {
		result[i] = map[string]interface{}{
			"id":              req.ID,
			"endpointId":      req.EndpointID,
			"name":            req.Name,
			"pathParamsJson":  req.PathParamsJSON,
			"queryParamsJson": req.QueryParamsJSON,
			"headersJson":     req.HeadersJSON,
			"body":            req.Body,
			"createdAt":       req.CreatedAt,
		}
	}

	return IPCResponse{
		Success: true,
		Data:    result,
	}
}

// handleUpdateSavedRequest updates an existing saved request
func (h *Handler) handleUpdateSavedRequest(data json.RawMessage) IPCResponse {
	var input struct {
		ID              int64  `json:"id"`
		EndpointID      int64  `json:"endpointId"`
		Name            string `json:"name"`
		PathParamsJSON  string `json:"pathParamsJson"`
		QueryParamsJSON string `json:"queryParamsJson"`
		HeadersJSON     string `json:"headersJson"`
		Body            string `json:"body"`
	}

	if err := json.Unmarshal(data, &input); err != nil {
		return IPCResponse{
			Success: false,
			Error:   fmt.Sprintf("invalid request data: %v", err),
		}
	}

	savedRequest := db.SavedRequest{
		ID:              input.ID,
		EndpointID:      input.EndpointID,
		Name:            input.Name,
		PathParamsJSON:  input.PathParamsJSON,
		QueryParamsJSON: input.QueryParamsJSON,
		HeadersJSON:     input.HeadersJSON,
		Body:            input.Body,
	}

	err := db.UpdateSavedRequest(h.database, savedRequest)
	if err != nil {
		return IPCResponse{
			Success: false,
			Error:   fmt.Sprintf("failed to update saved request: %v", err),
		}
	}

	return IPCResponse{
		Success: true,
		Data: map[string]interface{}{
			"id":              input.ID,
			"endpointId":      input.EndpointID,
			"name":            input.Name,
			"pathParamsJson":  input.PathParamsJSON,
			"queryParamsJson": input.QueryParamsJSON,
			"headersJson":     input.HeadersJSON,
			"body":            input.Body,
		},
	}
}

// handleDeleteSavedRequest deletes a saved request
func (h *Handler) handleDeleteSavedRequest(data json.RawMessage) IPCResponse {
	var input struct {
		ID int64 `json:"id"`
	}

	if err := json.Unmarshal(data, &input); err != nil {
		return IPCResponse{
			Success: false,
			Error:   fmt.Sprintf("invalid request data: %v", err),
		}
	}

	err := db.DeleteSavedRequest(h.database, input.ID)
	if err != nil {
		return IPCResponse{
			Success: false,
			Error:   fmt.Sprintf("failed to delete saved request: %v", err),
		}
	}

	return IPCResponse{
		Success: true,
		Data: map[string]interface{}{
			"deleted": true,
		},
	}
}
