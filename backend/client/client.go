package client

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// Environment represents the deployment environment
type Environment string

const (
	EnvLocal      Environment = "LOCAL"
	EnvStaging    Environment = "STAGING"
	EnvProduction Environment = "PRODUCTION"
)

// RequestConfig contains all parameters for making an HTTP request
type RequestConfig struct {
	ServiceID   string
	Port        int // Unused - local proxy on port 80 handles routing
	Endpoint    string
	Method      string
	Headers     map[string]string
	Body        string
	Environment Environment
	Timeout     time.Duration
}

// Response contains the HTTP response data
type Response struct {
	StatusCode   int
	Status       string
	Headers      map[string][]string
	Body         string
	ResponseTime time.Duration
	Error        string
}

// buildURL constructs the full URL based on environment and config
// LOCAL uses http://localhost/<service_id>/<endpoint> (local proxy on port 80 routes to services)
// STAGING/PRODUCTION use DNS records with service_id in subdomain
func buildURL(config RequestConfig) string {
	// Ensure endpoint starts with /
	endpoint := config.Endpoint
	if !strings.HasPrefix(endpoint, "/") {
		endpoint = "/" + endpoint
	}

	switch config.Environment {
	case EnvLocal:
		return fmt.Sprintf("http://localhost/%s%s", config.ServiceID, endpoint)
	case EnvStaging:
		return fmt.Sprintf("https://stg.%s.srv.whale3.io%s", config.ServiceID, endpoint)
	case EnvProduction:
		return fmt.Sprintf("https://%s.srv.whale3.io%s", config.ServiceID, endpoint)
	default:
		return ""
	}
}

// ExecuteRequest executes an HTTP request based on the config
func ExecuteRequest(config RequestConfig) Response {
	url := buildURL(config)
	return executeRequestWithURL(url, config)
}

// executeRequestWithURL executes an HTTP request with a given URL (testable)
func executeRequestWithURL(url string, config RequestConfig) Response {
	start := time.Now()

	// Set default timeout if not specified
	timeout := config.Timeout
	if timeout == 0 {
		timeout = 30 * time.Second
	}

	// Create context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	// Create HTTP request
	var bodyReader io.Reader
	if config.Body != "" {
		bodyReader = strings.NewReader(config.Body)
	}

	req, err := http.NewRequestWithContext(ctx, config.Method, url, bodyReader)
	if err != nil {
		return Response{
			Error:        fmt.Sprintf("failed to create request: %v", err),
			ResponseTime: time.Since(start),
		}
	}

	// Set headers
	for key, value := range config.Headers {
		req.Header.Set(key, value)
	}

	// Execute request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return Response{
			Error:        fmt.Sprintf("request failed: %v", err),
			ResponseTime: time.Since(start),
		}
	}
	defer resp.Body.Close()

	// Read response body
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return Response{
			StatusCode:   resp.StatusCode,
			Status:       resp.Status,
			Headers:      resp.Header,
			Error:        fmt.Sprintf("failed to read response body: %v", err),
			ResponseTime: time.Since(start),
		}
	}

	return Response{
		StatusCode:   resp.StatusCode,
		Status:       resp.Status,
		Headers:      resp.Header,
		Body:         string(bodyBytes),
		ResponseTime: time.Since(start),
	}
}
