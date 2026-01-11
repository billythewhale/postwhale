package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/triplewhale/postwhale/ipc"
)

func main() {
	// Get user data directory for database
	homeDir, err := os.UserHomeDir()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: failed to get home directory: %v\n", err)
		os.Exit(1)
	}

	// Create PostWhale data directory if it doesn't exist
	dataDir := filepath.Join(homeDir, ".postwhale")
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		fmt.Fprintf(os.Stderr, "Error: failed to create data directory: %v\n", err)
		os.Exit(1)
	}

	// Initialize database
	dbPath := filepath.Join(dataDir, "postwhale.db")
	handler := ipc.NewHandler(dbPath)
	defer handler.Close()

	fmt.Fprintf(os.Stderr, "PostWhale Backend Started (DB: %s)\n", dbPath)

	// Read JSON requests from stdin, write responses to stdout
	scanner := bufio.NewScanner(os.Stdin)
	for scanner.Scan() {
		line := scanner.Text()

		// Parse request
		var request ipc.IPCRequest
		if err := json.Unmarshal([]byte(line), &request); err != nil {
			response := ipc.IPCResponse{
				Success: false,
				Error:   fmt.Sprintf("invalid JSON: %v", err),
			}
			writeResponse(response)
			continue
		}

		// Handle request
		response := handler.HandleRequest(request)

		// Write response
		writeResponse(response)
	}

	if err := scanner.Err(); err != nil {
		fmt.Fprintf(os.Stderr, "Error reading stdin: %v\n", err)
		os.Exit(1)
	}
}

func writeResponse(response ipc.IPCResponse) {
	responseJSON, err := json.Marshal(response)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error marshaling response: %v\n", err)
		return
	}
	fmt.Println(string(responseJSON))
}
