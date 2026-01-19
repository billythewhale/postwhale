package portability

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

const FileName = "postwhale.saved.yml"
const CurrentVersion = 1

type SavedRequestWithEndpoint struct {
	ID              int64
	EndpointID      int64
	Name            string
	PathParamsJSON  string
	QueryParamsJSON string
	HeadersJSON     string
	Body            string
	Method          string
	Path            string
}

func GetSavedRequestsWithEndpoints(db *sql.DB, serviceID int64) ([]SavedRequestWithEndpoint, error) {
	query := `
		SELECT sr.id, sr.endpoint_id, sr.name, sr.path_params_json, sr.query_params_json, sr.headers_json, sr.body, e.method, e.path
		FROM saved_requests sr
		JOIN endpoints e ON sr.endpoint_id = e.id
		WHERE e.service_id = ?
		ORDER BY e.path, e.method, sr.name
	`
	rows, err := db.Query(query, serviceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []SavedRequestWithEndpoint
	for rows.Next() {
		var r SavedRequestWithEndpoint
		if err := rows.Scan(&r.ID, &r.EndpointID, &r.Name, &r.PathParamsJSON, &r.QueryParamsJSON, &r.HeadersJSON, &r.Body, &r.Method, &r.Path); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, rows.Err()
}

func GetServicePath(db *sql.DB, serviceID int64) (string, string, error) {
	query := `
		SELECT s.service_id, r.path
		FROM services s
		JOIN repositories r ON s.repo_id = r.id
		WHERE s.id = ?
	`
	var svcID, repoPath string
	err := db.QueryRow(query, serviceID).Scan(&svcID, &repoPath)
	if err != nil {
		return "", "", err
	}
	return svcID, filepath.Join(repoPath, "services", svcID), nil
}

func GetRepoServices(db *sql.DB, repoID int64) ([]struct {
	ID        int64
	ServiceID string
}, error) {
	rows, err := db.Query("SELECT id, service_id FROM services WHERE repo_id = ?", repoID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var services []struct {
		ID        int64
		ServiceID string
	}
	for rows.Next() {
		var s struct {
			ID        int64
			ServiceID string
		}
		if err := rows.Scan(&s.ID, &s.ServiceID); err != nil {
			return nil, err
		}
		services = append(services, s)
	}
	return services, rows.Err()
}

func GetRepoPath(db *sql.DB, repoID int64) (string, error) {
	var path string
	err := db.QueryRow("SELECT path FROM repositories WHERE id = ?", repoID).Scan(&path)
	return path, err
}

func ExportServiceSavedRequests(db *sql.DB, serviceID int64) (*ExportResult, error) {
	svcID, svcPath, err := GetServicePath(db, serviceID)
	if err != nil {
		return nil, fmt.Errorf("failed to get service path: %w", err)
	}

	requests, err := GetSavedRequestsWithEndpoints(db, serviceID)
	if err != nil {
		return nil, fmt.Errorf("failed to get saved requests: %w", err)
	}

	if len(requests) == 0 {
		return &ExportResult{FilePath: "", Count: 0}, nil
	}

	file := SavedRequestsFile{
		Version:       CurrentVersion,
		ServiceID:     svcID,
		SavedRequests: make([]PortableSavedRequest, 0, len(requests)),
	}

	for _, r := range requests {
		portable := PortableSavedRequest{
			Name: r.Name,
			Endpoint: EndpointRef{
				Method: r.Method,
				Path:   r.Path,
			},
			Body: r.Body,
		}

		if r.PathParamsJSON != "" && r.PathParamsJSON != "{}" {
			var pathParams map[string]string
			if err := json.Unmarshal([]byte(r.PathParamsJSON), &pathParams); err == nil && len(pathParams) > 0 {
				portable.PathParams = pathParams
			}
		}

		if r.QueryParamsJSON != "" && r.QueryParamsJSON != "[]" && r.QueryParamsJSON != "{}" {
			var queryParams []QueryParam
			if err := json.Unmarshal([]byte(r.QueryParamsJSON), &queryParams); err == nil && len(queryParams) > 0 {
				portable.QueryParams = queryParams
			}
		}

		if r.HeadersJSON != "" && r.HeadersJSON != "[]" && r.HeadersJSON != "{}" {
			var headers []Header
			if err := json.Unmarshal([]byte(r.HeadersJSON), &headers); err == nil && len(headers) > 0 {
				portable.Headers = headers
			}
		}

		file.SavedRequests = append(file.SavedRequests, portable)
	}

	filePath := filepath.Join(svcPath, FileName)
	data, err := yaml.Marshal(&file)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal YAML: %w", err)
	}

	if err := os.WriteFile(filePath, data, 0644); err != nil {
		return nil, fmt.Errorf("failed to write file: %w", err)
	}

	return &ExportResult{FilePath: filePath, Count: len(file.SavedRequests)}, nil
}

func ImportServiceSavedRequests(db *sql.DB, serviceID int64) (*ImportResult, error) {
	svcID, svcPath, err := GetServicePath(db, serviceID)
	if err != nil {
		return nil, fmt.Errorf("failed to get service path: %w", err)
	}

	filePath := filepath.Join(svcPath, FileName)
	data, err := os.ReadFile(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, fmt.Errorf("no %s file found in service directory", FileName)
		}
		return nil, fmt.Errorf("failed to read file: %w", err)
	}

	var file SavedRequestsFile
	if err := yaml.Unmarshal(data, &file); err != nil {
		return nil, fmt.Errorf("failed to parse YAML: %w", err)
	}

	if file.ServiceID != svcID {
		return nil, fmt.Errorf("service_id mismatch: file has '%s', expected '%s'", file.ServiceID, svcID)
	}

	endpointMap, err := buildEndpointMap(db, serviceID)
	if err != nil {
		return nil, fmt.Errorf("failed to build endpoint map: %w", err)
	}

	existingRequests, err := getExistingRequestsByEndpoint(db, serviceID)
	if err != nil {
		return nil, fmt.Errorf("failed to get existing requests: %w", err)
	}

	result := &ImportResult{Errors: []string{}}

	for _, portable := range file.SavedRequests {
		key := portable.Endpoint.Method + ":" + portable.Endpoint.Path
		endpointID, ok := endpointMap[key]
		if !ok {
			result.Errors = append(result.Errors, fmt.Sprintf("endpoint not found: %s %s", portable.Endpoint.Method, portable.Endpoint.Path))
			result.Skipped++
			continue
		}

		pathParamsJSON := "{}"
		if len(portable.PathParams) > 0 {
			if data, err := json.Marshal(portable.PathParams); err == nil {
				pathParamsJSON = string(data)
			}
		}

		queryParamsJSON := "[]"
		if len(portable.QueryParams) > 0 {
			if data, err := json.Marshal(portable.QueryParams); err == nil {
				queryParamsJSON = string(data)
			}
		}

		headersJSON := "[]"
		if len(portable.Headers) > 0 {
			if data, err := json.Marshal(portable.Headers); err == nil {
				headersJSON = string(data)
			}
		}

		existingID, exists := existingRequests[endpointID][portable.Name]
		if exists {
			_, err := db.Exec(
				"UPDATE saved_requests SET path_params_json = ?, query_params_json = ?, headers_json = ?, body = ? WHERE id = ?",
				pathParamsJSON, queryParamsJSON, headersJSON, portable.Body, existingID,
			)
			if err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("failed to update '%s': %v", portable.Name, err))
				result.Skipped++
				continue
			}
			result.Replaced++
		} else {
			_, err := db.Exec(
				"INSERT INTO saved_requests (endpoint_id, name, path_params_json, query_params_json, headers_json, body) VALUES (?, ?, ?, ?, ?, ?)",
				endpointID, portable.Name, pathParamsJSON, queryParamsJSON, headersJSON, portable.Body,
			)
			if err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("failed to add '%s': %v", portable.Name, err))
				result.Skipped++
				continue
			}
			result.Added++
		}
	}

	return result, nil
}

func buildEndpointMap(db *sql.DB, serviceID int64) (map[string]int64, error) {
	rows, err := db.Query("SELECT id, method, path FROM endpoints WHERE service_id = ?", serviceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	m := make(map[string]int64)
	for rows.Next() {
		var id int64
		var method, path string
		if err := rows.Scan(&id, &method, &path); err != nil {
			return nil, err
		}
		m[method+":"+path] = id
	}
	return m, rows.Err()
}

func getExistingRequestsByEndpoint(db *sql.DB, serviceID int64) (map[int64]map[string]int64, error) {
	query := `
		SELECT sr.id, sr.endpoint_id, sr.name
		FROM saved_requests sr
		JOIN endpoints e ON sr.endpoint_id = e.id
		WHERE e.service_id = ?
	`
	rows, err := db.Query(query, serviceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	m := make(map[int64]map[string]int64)
	for rows.Next() {
		var id, endpointID int64
		var name string
		if err := rows.Scan(&id, &endpointID, &name); err != nil {
			return nil, err
		}
		if m[endpointID] == nil {
			m[endpointID] = make(map[string]int64)
		}
		m[endpointID][name] = id
	}
	return m, rows.Err()
}

func ExportRepoSavedRequests(db *sql.DB, repoID int64) ([]ExportResult, error) {
	services, err := GetRepoServices(db, repoID)
	if err != nil {
		return nil, fmt.Errorf("failed to get services: %w", err)
	}

	var results []ExportResult
	for _, svc := range services {
		result, err := ExportServiceSavedRequests(db, svc.ID)
		if err != nil {
			results = append(results, ExportResult{FilePath: svc.ServiceID, Count: -1})
			continue
		}
		if result.Count > 0 {
			results = append(results, *result)
		}
	}
	return results, nil
}

func ImportRepoSavedRequests(db *sql.DB, repoID int64) (map[string]*ImportResult, error) {
	services, err := GetRepoServices(db, repoID)
	if err != nil {
		return nil, fmt.Errorf("failed to get services: %w", err)
	}

	repoPath, err := GetRepoPath(db, repoID)
	if err != nil {
		return nil, fmt.Errorf("failed to get repo path: %w", err)
	}

	results := make(map[string]*ImportResult)
	for _, svc := range services {
		filePath := filepath.Join(repoPath, "services", svc.ServiceID, FileName)
		if _, err := os.Stat(filePath); os.IsNotExist(err) {
			continue
		}

		result, err := ImportServiceSavedRequests(db, svc.ID)
		if err != nil {
			results[svc.ServiceID] = &ImportResult{Errors: []string{err.Error()}}
			continue
		}
		results[svc.ServiceID] = result
	}
	return results, nil
}
