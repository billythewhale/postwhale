package client

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestBuildURL_Local(t *testing.T) {
	config := RequestConfig{
		ServiceID:   "fusion",
		Port:        3001,
		Endpoint:    "/orders",
		Environment: EnvLocal,
	}

	url := buildURL(config)
	expected := "http://localhost:3001/orders"

	if url != expected {
		t.Errorf("buildURL() = %q, want %q", url, expected)
	}
}

func TestBuildURL_Staging(t *testing.T) {
	config := RequestConfig{
		ServiceID:   "fusion",
		Endpoint:    "/orders",
		Environment: EnvStaging,
	}

	url := buildURL(config)
	expected := "https://stg.fusion.srv.whale3.io/orders"

	if url != expected {
		t.Errorf("buildURL() = %q, want %q", url, expected)
	}
}

func TestBuildURL_Production(t *testing.T) {
	config := RequestConfig{
		ServiceID:   "fusion",
		Endpoint:    "/orders",
		Environment: EnvProduction,
	}

	url := buildURL(config)
	expected := "https://fusion.srv.whale3.io/orders"

	if url != expected {
		t.Errorf("buildURL() = %q, want %q", url, expected)
	}
}

func TestBuildURL_WithLeadingSlash(t *testing.T) {
	config := RequestConfig{
		ServiceID:   "moby",
		Port:        3002,
		Endpoint:    "/chat",
		Environment: EnvLocal,
	}

	url := buildURL(config)
	expected := "http://localhost:3002/chat"

	if url != expected {
		t.Errorf("buildURL() = %q, want %q", url, expected)
	}
}

func TestBuildURL_WithoutLeadingSlash(t *testing.T) {
	config := RequestConfig{
		ServiceID:   "moby",
		Port:        3002,
		Endpoint:    "chat",
		Environment: EnvLocal,
	}

	url := buildURL(config)
	expected := "http://localhost:3002/chat"

	if url != expected {
		t.Errorf("buildURL() = %q, want %q", url, expected)
	}
}

func TestExecuteRequest_GET(t *testing.T) {
	// Mock HTTP server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "GET" {
			t.Errorf("Expected GET request, got %s", r.Method)
		}
		if r.URL.Path != "/test" {
			t.Errorf("Expected /test path, got %s", r.URL.Path)
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"success"}`))
	}))
	defer server.Close()

	config := RequestConfig{
		ServiceID:   "test",
		Port:        8080,
		Endpoint:    "/test",
		Method:      "GET",
		Environment: EnvLocal,
		Timeout:     5 * time.Second,
	}

	// Override with test server URL
	response := executeRequestWithURL(server.URL+"/test", config)

	if response.Error != "" {
		t.Errorf("Expected no error, got %s", response.Error)
	}
	if response.StatusCode != 200 {
		t.Errorf("Expected status 200, got %d", response.StatusCode)
	}
	if response.Body != `{"status":"success"}` {
		t.Errorf("Expected success body, got %s", response.Body)
	}
	if response.ResponseTime == 0 {
		t.Error("Expected non-zero response time")
	}
}

func TestExecuteRequest_POST_WithBody(t *testing.T) {
	// Mock HTTP server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			t.Errorf("Expected POST request, got %s", r.Method)
		}
		if r.Header.Get("Content-Type") != "application/json" {
			t.Errorf("Expected application/json content type")
		}

		var body map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Errorf("Failed to decode body: %v", err)
		}
		if body["name"] != "test" {
			t.Errorf("Expected name=test, got %v", body["name"])
		}

		w.WriteHeader(http.StatusCreated)
		w.Write([]byte(`{"id":"123"}`))
	}))
	defer server.Close()

	config := RequestConfig{
		ServiceID:   "test",
		Port:        8080,
		Endpoint:    "/create",
		Method:      "POST",
		Headers:     map[string]string{"Content-Type": "application/json"},
		Body:        `{"name":"test"}`,
		Environment: EnvLocal,
		Timeout:     5 * time.Second,
	}

	response := executeRequestWithURL(server.URL+"/create", config)

	if response.Error != "" {
		t.Errorf("Expected no error, got %s", response.Error)
	}
	if response.StatusCode != 201 {
		t.Errorf("Expected status 201, got %d", response.StatusCode)
	}
}

func TestExecuteRequest_Timeout(t *testing.T) {
	// Mock server that delays response
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(2 * time.Second)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	config := RequestConfig{
		ServiceID:   "test",
		Port:        8080,
		Endpoint:    "/slow",
		Method:      "GET",
		Environment: EnvLocal,
		Timeout:     100 * time.Millisecond, // Very short timeout
	}

	response := executeRequestWithURL(server.URL+"/slow", config)

	if response.Error == "" {
		t.Error("Expected timeout error, got none")
	}
	if !strings.Contains(response.Error, "timeout") && !strings.Contains(response.Error, "deadline") {
		t.Errorf("Expected timeout error message, got: %s", response.Error)
	}
}

func TestExecuteRequest_InvalidURL(t *testing.T) {
	config := RequestConfig{
		ServiceID:   "test",
		Port:        8080,
		Endpoint:    "/test",
		Method:      "GET",
		Environment: EnvLocal,
		Timeout:     5 * time.Second,
	}

	response := executeRequestWithURL("http://invalid-host-that-does-not-exist-12345.local", config)

	if response.Error == "" {
		t.Error("Expected error for invalid host, got none")
	}
}

func TestExecuteRequest_CustomHeaders(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-Custom-Header") != "test-value" {
			t.Errorf("Expected X-Custom-Header=test-value, got %s", r.Header.Get("X-Custom-Header"))
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	config := RequestConfig{
		ServiceID:   "test",
		Port:        8080,
		Endpoint:    "/test",
		Method:      "GET",
		Headers:     map[string]string{"X-Custom-Header": "test-value"},
		Environment: EnvLocal,
		Timeout:     5 * time.Second,
	}

	response := executeRequestWithURL(server.URL+"/test", config)

	if response.Error != "" {
		t.Errorf("Expected no error, got %s", response.Error)
	}
}
