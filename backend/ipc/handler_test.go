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
