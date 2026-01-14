package ipc

import (
	"encoding/json"
	"testing"
)

func TestHandleRequest_InvalidAction(t *testing.T) {
	handler := NewHandler(":memory:")
	defer handler.Close()

	request := IPCRequest{
		Action: "invalidAction",
		Data:   json.RawMessage(`{}`),
	}

	response := handler.HandleRequest(request)

	if response.Success {
		t.Error("Expected failure for invalid action")
	}
	if response.Error == "" {
		t.Error("Expected error message")
	}
}

func TestHandleRequest_MalformedJSON(t *testing.T) {
	handler := NewHandler(":memory:")
	defer handler.Close()

	request := IPCRequest{
		Action: "addRepository",
		Data:   json.RawMessage(`{invalid json}`),
	}

	response := handler.HandleRequest(request)

	if response.Success {
		t.Error("Expected failure for malformed JSON")
	}
	if response.Error == "" {
		t.Error("Expected error message")
	}
}

func TestHandleRequest_AddRepository(t *testing.T) {
	handler := NewHandler(":memory:")
	defer handler.Close()

	// Prepare request data
	data := map[string]string{
		"path": "../../fake-repo",
	}
	dataJSON, _ := json.Marshal(data)

	request := IPCRequest{
		Action: "addRepository",
		Data:   json.RawMessage(dataJSON),
	}

	response := handler.HandleRequest(request)

	if !response.Success {
		t.Errorf("Expected success, got error: %s", response.Error)
	}

	// Verify data structure
	if response.Data == nil {
		t.Fatal("Expected data in response")
	}

	// Response should contain repository info with services
	dataMap, ok := response.Data.(map[string]interface{})
	if !ok {
		t.Fatalf("Expected data to be map, got %T", response.Data)
	}

	if dataMap["path"] == nil {
		t.Error("Expected path in response data")
	}
}

func TestHandleRequest_GetRepositories(t *testing.T) {
	handler := NewHandler(":memory:")
	defer handler.Close()

	// First add a repository
	addData := map[string]string{
		"path": "../../fake-repo",
	}
	addDataJSON, _ := json.Marshal(addData)
	handler.HandleRequest(IPCRequest{
		Action: "addRepository",
		Data:   json.RawMessage(addDataJSON),
	})

	// Now get repositories
	request := IPCRequest{
		Action: "getRepositories",
		Data:   json.RawMessage(`{}`),
	}

	response := handler.HandleRequest(request)

	if !response.Success {
		t.Errorf("Expected success, got error: %s", response.Error)
	}

	// Verify response has repositories array
	if response.Data == nil {
		t.Fatal("Expected data in response")
	}

	repos, ok := response.Data.([]interface{})
	if !ok {
		t.Fatalf("Expected data to be array, got %T", response.Data)
	}

	if len(repos) == 0 {
		t.Error("Expected at least one repository")
	}
}

func TestHandleRequest_GetServices(t *testing.T) {
	handler := NewHandler(":memory:")
	defer handler.Close()

	// First add a repository
	addData := map[string]string{
		"path": "../../fake-repo",
	}
	addDataJSON, _ := json.Marshal(addData)
	addResponse := handler.HandleRequest(IPCRequest{
		Action: "addRepository",
		Data:   json.RawMessage(addDataJSON),
	})

	if !addResponse.Success {
		t.Fatalf("Failed to add repository: %s", addResponse.Error)
	}

	// Extract repository ID
	addDataMap := addResponse.Data.(map[string]interface{})
	var repoID int64
	switch v := addDataMap["id"].(type) {
	case int64:
		repoID = v
	case float64:
		repoID = int64(v)
	default:
		t.Fatalf("Expected id to be int64 or float64, got %T", v)
	}

	// Get services for this repository
	getServicesData := map[string]int64{
		"repositoryId": repoID,
	}
	getServicesJSON, _ := json.Marshal(getServicesData)

	request := IPCRequest{
		Action: "getServices",
		Data:   json.RawMessage(getServicesJSON),
	}

	response := handler.HandleRequest(request)

	if !response.Success {
		t.Errorf("Expected success, got error: %s", response.Error)
	}

	services, ok := response.Data.([]interface{})
	if !ok {
		t.Fatalf("Expected data to be array, got %T", response.Data)
	}

	if len(services) != 2 {
		t.Errorf("Expected 2 services, got %d", len(services))
	}
}

func TestHandleRequest_RemoveRepository(t *testing.T) {
	handler := NewHandler(":memory:")
	defer handler.Close()

	// Add repository first
	addData := map[string]string{
		"path": "../../fake-repo",
	}
	addDataJSON, _ := json.Marshal(addData)
	addResponse := handler.HandleRequest(IPCRequest{
		Action: "addRepository",
		Data:   json.RawMessage(addDataJSON),
	})

	addDataMap := addResponse.Data.(map[string]interface{})
	var repoID int64
	switch v := addDataMap["id"].(type) {
	case int64:
		repoID = v
	case float64:
		repoID = int64(v)
	default:
		t.Fatalf("Expected id to be int64 or float64, got %T", v)
	}

	// Remove repository
	removeData := map[string]int64{
		"id": repoID,
	}
	removeDataJSON, _ := json.Marshal(removeData)

	request := IPCRequest{
		Action: "removeRepository",
		Data:   json.RawMessage(removeDataJSON),
	}

	response := handler.HandleRequest(request)

	if !response.Success {
		t.Errorf("Expected success, got error: %s", response.Error)
	}

	// Verify repository is gone
	getReposResponse := handler.HandleRequest(IPCRequest{
		Action: "getRepositories",
		Data:   json.RawMessage(`{}`),
	})

	repos := getReposResponse.Data.([]interface{})
	if len(repos) != 0 {
		t.Errorf("Expected 0 repositories after removal, got %d", len(repos))
	}
}

func TestHandleRequest_ExecuteRequest(t *testing.T) {
	handler := NewHandler(":memory:")
	defer handler.Close()

	// Test executeRequest with minimal configuration
	requestData := map[string]interface{}{
		"serviceId":   "test-service",
		"port":        8080,
		"endpoint":    "/health",
		"method":      "GET",
		"environment": "LOCAL",
		"headers":     map[string]string{},
		"body":        "",
	}
	requestJSON, _ := json.Marshal(requestData)

	request := IPCRequest{
		Action: "executeRequest",
		Data:   json.RawMessage(requestJSON),
	}

	response := handler.HandleRequest(request)

	// Response should have data (even if request fails due to no running service)
	// We're testing the handler parses the request correctly, not that the HTTP call succeeds
	if response.Data == nil {
		t.Fatal("Expected data in response")
	}

	dataMap, ok := response.Data.(map[string]interface{})
	if !ok {
		t.Fatalf("Expected data to be map, got %T", response.Data)
	}

	// Should have status code and response time
	if dataMap["statusCode"] == nil && dataMap["error"] == nil {
		t.Error("Expected either statusCode or error in response")
	}

	if dataMap["responseTime"] == nil {
		t.Error("Expected responseTime in response")
	}
}

// RED: Test saving a saved request
func TestHandleRequest_SaveSavedRequest(t *testing.T) {
	handler := NewHandler(":memory:")
	defer handler.Close()

	// Setup test data - create repo, service, endpoint
	repoPath := "/fake/path"
	repoData := map[string]string{"path": repoPath}
	repoJSON, _ := json.Marshal(repoData)

	// Create repository (will fail scan but that's OK for test)
	repoReq := IPCRequest{Action: "addRepository", Data: json.RawMessage(repoJSON)}
	_ = handler.HandleRequest(repoReq)

	// Create endpoint manually for test
	_, _ = handler.database.Exec("INSERT INTO repositories (name, path) VALUES (?, ?)", "test-repo", repoPath)
	_, _ = handler.database.Exec("INSERT INTO services (repo_id, service_id, name, port, config_json) VALUES (?, ?, ?, ?, ?)", 1, "test-service", "Test Service", 3000, "{}")
	result, _ := handler.database.Exec("INSERT INTO endpoints (service_id, method, path, operation_id, spec_json) VALUES (?, ?, ?, ?, ?)", 1, "GET", "/api/test", "getTest", "{}")
	endpointID, _ := result.LastInsertId()

	// Save a saved request
	savedReqData := map[string]interface{}{
		"endpointId":      endpointID,
		"name":            "Test Request",
		"pathParamsJson":  `{"id": "123"}`,
		"queryParamsJson": `[{"key": "limit", "value": "10", "enabled": true}]`,
		"headersJson":     `[{"key": "Authorization", "value": "Bearer token", "enabled": true}]`,
		"body":            `{"test": "data"}`,
	}
	savedReqJSON, _ := json.Marshal(savedReqData)

	request := IPCRequest{
		Action: "saveSavedRequest",
		Data:   json.RawMessage(savedReqJSON),
	}

	response := handler.HandleRequest(request)

	if !response.Success {
		t.Fatalf("Expected success, got error: %s", response.Error)
	}

	dataMap, ok := response.Data.(map[string]interface{})
	if !ok {
		t.Fatalf("Expected data to be map, got %T", response.Data)
	}

	if dataMap["id"] == nil {
		t.Error("Expected id in response")
	}
}

// RED: Test getting saved requests for an endpoint
func TestHandleRequest_GetSavedRequests(t *testing.T) {
	handler := NewHandler(":memory:")
	defer handler.Close()

	// Setup test data
	repoPath := "/fake/path"
	_, _ = handler.database.Exec("INSERT INTO repositories (name, path) VALUES (?, ?)", "test-repo", repoPath)
	_, _ = handler.database.Exec("INSERT INTO services (repo_id, service_id, name, port, config_json) VALUES (?, ?, ?, ?, ?)", 1, "test-service", "Test Service", 3000, "{}")
	result, _ := handler.database.Exec("INSERT INTO endpoints (service_id, method, path, operation_id, spec_json) VALUES (?, ?, ?, ?, ?)", 1, "GET", "/api/test", "getTest", "{}")
	endpointID, _ := result.LastInsertId()

	// Add saved requests
	_, _ = handler.database.Exec("INSERT INTO saved_requests (endpoint_id, name, path_params_json, query_params_json, headers_json, body) VALUES (?, ?, ?, ?, ?, ?)", endpointID, "Request 1", "{}", "[]", "[]", "")
	_, _ = handler.database.Exec("INSERT INTO saved_requests (endpoint_id, name, path_params_json, query_params_json, headers_json, body) VALUES (?, ?, ?, ?, ?, ?)", endpointID, "Request 2", "{}", "[]", "[]", "")

	// Get saved requests
	requestData := map[string]interface{}{
		"endpointId": endpointID,
	}
	requestJSON, _ := json.Marshal(requestData)

	request := IPCRequest{
		Action: "getSavedRequests",
		Data:   json.RawMessage(requestJSON),
	}

	response := handler.HandleRequest(request)

	if !response.Success {
		t.Fatalf("Expected success, got error: %s", response.Error)
	}

	dataSlice, ok := response.Data.([]interface{})
	if !ok {
		t.Fatalf("Expected data to be slice, got %T", response.Data)
	}

	if len(dataSlice) != 2 {
		t.Errorf("Expected 2 saved requests, got %d", len(dataSlice))
	}
}

// RED: Test updating a saved request
func TestHandleRequest_UpdateSavedRequest(t *testing.T) {
	handler := NewHandler(":memory:")
	defer handler.Close()

	// Setup test data
	_, _ = handler.database.Exec("INSERT INTO repositories (name, path) VALUES (?, ?)", "test-repo", "/fake")
	_, _ = handler.database.Exec("INSERT INTO services (repo_id, service_id, name, port, config_json) VALUES (?, ?, ?, ?, ?)", 1, "test-service", "Test Service", 3000, "{}")
	result, _ := handler.database.Exec("INSERT INTO endpoints (service_id, method, path, operation_id, spec_json) VALUES (?, ?, ?, ?, ?)", 1, "GET", "/api/test", "getTest", "{}")
	endpointID, _ := result.LastInsertId()

	result, _ = handler.database.Exec("INSERT INTO saved_requests (endpoint_id, name, path_params_json, query_params_json, headers_json, body) VALUES (?, ?, ?, ?, ?, ?)", endpointID, "Original", "{}", "[]", "[]", "")
	savedReqID, _ := result.LastInsertId()

	// Update saved request
	updateData := map[string]interface{}{
		"id":              savedReqID,
		"endpointId":      endpointID,
		"name":            "Updated Name",
		"pathParamsJson":  `{"id": "456"}`,
		"queryParamsJson": "[]",
		"headersJson":     "[]",
		"body":            `{"updated": "data"}`,
	}
	updateJSON, _ := json.Marshal(updateData)

	request := IPCRequest{
		Action: "updateSavedRequest",
		Data:   json.RawMessage(updateJSON),
	}

	response := handler.HandleRequest(request)

	if !response.Success {
		t.Fatalf("Expected success, got error: %s", response.Error)
	}

	// Verify update
	var name string
	handler.database.QueryRow("SELECT name FROM saved_requests WHERE id = ?", savedReqID).Scan(&name)
	if name != "Updated Name" {
		t.Errorf("Expected name 'Updated Name', got '%s'", name)
	}
}

// RED: Test deleting a saved request
func TestHandleRequest_DeleteSavedRequest(t *testing.T) {
	handler := NewHandler(":memory:")
	defer handler.Close()

	// Setup test data
	_, _ = handler.database.Exec("INSERT INTO repositories (name, path) VALUES (?, ?)", "test-repo", "/fake")
	_, _ = handler.database.Exec("INSERT INTO services (repo_id, service_id, name, port, config_json) VALUES (?, ?, ?, ?, ?)", 1, "test-service", "Test Service", 3000, "{}")
	result, _ := handler.database.Exec("INSERT INTO endpoints (service_id, method, path, operation_id, spec_json) VALUES (?, ?, ?, ?, ?)", 1, "GET", "/api/test", "getTest", "{}")
	endpointID, _ := result.LastInsertId()

	result, _ = handler.database.Exec("INSERT INTO saved_requests (endpoint_id, name, path_params_json, query_params_json, headers_json, body) VALUES (?, ?, ?, ?, ?, ?)", endpointID, "To Delete", "{}", "[]", "[]", "")
	savedReqID, _ := result.LastInsertId()

	// Delete saved request
	deleteData := map[string]interface{}{
		"id": savedReqID,
	}
	deleteJSON, _ := json.Marshal(deleteData)

	request := IPCRequest{
		Action: "deleteSavedRequest",
		Data:   json.RawMessage(deleteJSON),
	}

	response := handler.HandleRequest(request)

	if !response.Success {
		t.Fatalf("Expected success, got error: %s", response.Error)
	}

	// Verify deletion
	var count int
	handler.database.QueryRow("SELECT COUNT(*) FROM saved_requests WHERE id = ?", savedReqID).Scan(&count)
	if count != 0 {
		t.Errorf("Expected saved request to be deleted, but found %d", count)
	}
}
