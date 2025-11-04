#!/bin/bash

################################################################################
# Hetzner Embeddings Service Test Script
#
# Tests the self-hosted embeddings service deployment on Hetzner VPS
#
# Usage:
#   ./test-hetzner-embeddings.sh
#   ./test-hetzner-embeddings.sh --host http://178.156.182.99:8080
#   ./test-hetzner-embeddings.sh --verbose
#
# Tests performed:
#   1. Health check
#   2. Single embedding generation
#   3. Batch embedding generation
#   4. Performance benchmarking
#   5. Output validation (768 dimensions)
#   6. Error handling
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
EMBEDDINGS_HOST="${1:-http://178.156.182.99:8080}"
VERBOSE=false
EXPECTED_DIMENSIONS=768

# Parse arguments
for arg in "$@"; do
  case $arg in
    --host=*)
      EMBEDDINGS_HOST="${arg#*=}"
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --help)
      echo "Usage: $0 [--host=URL] [--verbose]"
      echo ""
      echo "Options:"
      echo "  --host=URL    Embeddings service URL (default: http://178.156.182.99:8080)"
      echo "  --verbose     Show detailed output"
      echo "  --help        Show this help message"
      exit 0
      ;;
  esac
done

# Helper functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_verbose() {
  if [ "$VERBOSE" = true ]; then
    echo -e "${YELLOW}[DEBUG]${NC} $1"
  fi
}

# Check prerequisites
check_prerequisites() {
  log_info "Checking prerequisites..."

  # Check if curl is installed
  if ! command -v curl &> /dev/null; then
    log_error "curl is not installed. Please install it first."
    exit 1
  fi

  # Check if jq is installed
  if ! command -v jq &> /dev/null; then
    log_warning "jq is not installed. Some output will be less readable."
    log_warning "Install with: brew install jq (macOS) or apt install jq (Ubuntu)"
  fi

  log_success "Prerequisites check passed"
}

# Test 1: Health check
test_health_check() {
  log_info "Test 1: Health check..."

  local response
  local http_code

  response=$(curl -s -w "\n%{http_code}" "${EMBEDDINGS_HOST}/health" 2>&1)
  http_code=$(echo "$response" | tail -n 1)
  local body=$(echo "$response" | head -n -1)

  if [ "$http_code" == "200" ]; then
    log_success "Health check passed (HTTP $http_code)"
    log_verbose "Response: $body"
    return 0
  else
    log_error "Health check failed (HTTP $http_code)"
    log_error "Response: $body"
    return 1
  fi
}

# Test 2: Single embedding generation
test_single_embedding() {
  log_info "Test 2: Single embedding generation..."

  local test_text="Hello, world! This is a test sentence for embedding generation."
  local response
  local http_code

  response=$(curl -s -w "\n%{http_code}" -X POST "${EMBEDDINGS_HOST}/embed" \
    -H "Content-Type: application/json" \
    -d "{\"inputs\": \"${test_text}\"}" 2>&1)

  http_code=$(echo "$response" | tail -n 1)
  local body=$(echo "$response" | head -n -1)

  if [ "$http_code" == "200" ]; then
    # Check if jq is available for validation
    if command -v jq &> /dev/null; then
      local dimensions=$(echo "$body" | jq '.[0] | length')

      if [ "$dimensions" == "$EXPECTED_DIMENSIONS" ]; then
        log_success "Single embedding passed (HTTP $http_code, $dimensions dimensions)"
        log_verbose "First 5 values: $(echo "$body" | jq '.[0][0:5]')"
        return 0
      else
        log_error "Dimension mismatch: expected $EXPECTED_DIMENSIONS, got $dimensions"
        return 1
      fi
    else
      log_success "Single embedding passed (HTTP $http_code)"
      log_warning "Install jq to validate dimensions"
      return 0
    fi
  else
    log_error "Single embedding failed (HTTP $http_code)"
    log_error "Response: $body"
    return 1
  fi
}

# Test 3: Batch embedding generation
test_batch_embedding() {
  log_info "Test 3: Batch embedding generation..."

  local test_data='{"inputs": [
    "First document to embed",
    "Second document to embed",
    "Third document to embed"
  ]}'

  local response
  local http_code

  response=$(curl -s -w "\n%{http_code}" -X POST "${EMBEDDINGS_HOST}/embed" \
    -H "Content-Type: application/json" \
    -d "${test_data}" 2>&1)

  http_code=$(echo "$response" | tail -n 1)
  local body=$(echo "$response" | head -n -1)

  if [ "$http_code" == "200" ]; then
    # Check if jq is available for validation
    if command -v jq &> /dev/null; then
      local batch_count=$(echo "$body" | jq '. | length')
      local first_dim=$(echo "$body" | jq '.[0] | length')

      if [ "$batch_count" == "3" ] && [ "$first_dim" == "$EXPECTED_DIMENSIONS" ]; then
        log_success "Batch embedding passed (HTTP $http_code, $batch_count embeddings)"
        log_verbose "Dimensions: $first_dim per embedding"
        return 0
      else
        log_error "Batch validation failed: expected 3 embeddings of $EXPECTED_DIMENSIONS dimensions"
        log_error "Got: $batch_count embeddings of $first_dim dimensions"
        return 1
      fi
    else
      log_success "Batch embedding passed (HTTP $http_code)"
      return 0
    fi
  else
    log_error "Batch embedding failed (HTTP $http_code)"
    log_error "Response: $body"
    return 1
  fi
}

# Test 4: Performance benchmark
test_performance() {
  log_info "Test 4: Performance benchmark..."

  local test_text="This is a performance test sentence for measuring embedding generation speed and latency."
  local iterations=10
  local total_time=0

  for i in $(seq 1 $iterations); do
    local start=$(date +%s%3N)

    curl -s -X POST "${EMBEDDINGS_HOST}/embed" \
      -H "Content-Type: application/json" \
      -d "{\"inputs\": \"${test_text}\"}" > /dev/null

    local end=$(date +%s%3N)
    local elapsed=$((end - start))
    total_time=$((total_time + elapsed))

    log_verbose "Request $i: ${elapsed}ms"
  done

  local avg_time=$((total_time / iterations))

  log_success "Performance benchmark completed"
  echo -e "  ${BLUE}Average latency:${NC} ${avg_time}ms (over $iterations requests)"
  echo -e "  ${BLUE}Total time:${NC} ${total_time}ms"

  if [ $avg_time -lt 100 ]; then
    echo -e "  ${GREEN}Status:${NC} Excellent (<100ms)"
  elif [ $avg_time -lt 200 ]; then
    echo -e "  ${GREEN}Status:${NC} Good (100-200ms)"
  elif [ $avg_time -lt 500 ]; then
    echo -e "  ${YELLOW}Status:${NC} Acceptable (200-500ms)"
  else
    echo -e "  ${YELLOW}Status:${NC} Slow (>500ms) - consider optimization"
  fi

  return 0
}

# Test 5: Output validation
test_output_validation() {
  log_info "Test 5: Output validation..."

  if ! command -v jq &> /dev/null; then
    log_warning "Skipping output validation (jq not installed)"
    return 0
  fi

  local test_text="Validate that output is properly formatted and contains expected types."
  local response

  response=$(curl -s -X POST "${EMBEDDINGS_HOST}/embed" \
    -H "Content-Type: application/json" \
    -d "{\"inputs\": \"${test_text}\"}")

  # Check if output is an array
  local is_array=$(echo "$response" | jq 'type == "array"')
  if [ "$is_array" != "true" ]; then
    log_error "Output validation failed: response is not an array"
    return 1
  fi

  # Check if first element is an array of numbers
  local first_elem_is_array=$(echo "$response" | jq '.[0] | type == "array"')
  if [ "$first_elem_is_array" != "true" ]; then
    log_error "Output validation failed: first element is not an array"
    return 1
  fi

  # Check if all elements are numbers
  local all_numbers=$(echo "$response" | jq '.[0] | map(type == "number") | all')
  if [ "$all_numbers" != "true" ]; then
    log_error "Output validation failed: not all elements are numbers"
    return 1
  fi

  # Check dimension count
  local dimensions=$(echo "$response" | jq '.[0] | length')
  if [ "$dimensions" != "$EXPECTED_DIMENSIONS" ]; then
    log_error "Output validation failed: expected $EXPECTED_DIMENSIONS dimensions, got $dimensions"
    return 1
  fi

  log_success "Output validation passed"
  log_verbose "All values are numeric floats in expected format"
  return 0
}

# Test 6: Error handling
test_error_handling() {
  log_info "Test 6: Error handling..."

  # Test 6a: Empty input
  local response_empty
  local http_code_empty

  response_empty=$(curl -s -w "\n%{http_code}" -X POST "${EMBEDDINGS_HOST}/embed" \
    -H "Content-Type: application/json" \
    -d '{"inputs": ""}' 2>&1)

  http_code_empty=$(echo "$response_empty" | tail -n 1)

  if [ "$http_code_empty" == "200" ] || [ "$http_code_empty" == "400" ]; then
    log_success "Empty input handled (HTTP $http_code_empty)"
  else
    log_warning "Unexpected response for empty input (HTTP $http_code_empty)"
  fi

  # Test 6b: Invalid JSON
  local response_invalid
  local http_code_invalid

  response_invalid=$(curl -s -w "\n%{http_code}" -X POST "${EMBEDDINGS_HOST}/embed" \
    -H "Content-Type: application/json" \
    -d 'invalid json' 2>&1)

  http_code_invalid=$(echo "$response_invalid" | tail -n 1)

  if [ "$http_code_invalid" == "400" ] || [ "$http_code_invalid" == "422" ]; then
    log_success "Invalid JSON rejected (HTTP $http_code_invalid)"
  else
    log_warning "Unexpected response for invalid JSON (HTTP $http_code_invalid)"
  fi

  # Test 6c: Missing inputs field
  local response_missing
  local http_code_missing

  response_missing=$(curl -s -w "\n%{http_code}" -X POST "${EMBEDDINGS_HOST}/embed" \
    -H "Content-Type: application/json" \
    -d '{"text": "wrong field name"}' 2>&1)

  http_code_missing=$(echo "$response_missing" | tail -n 1)

  if [ "$http_code_missing" == "400" ] || [ "$http_code_missing" == "422" ]; then
    log_success "Missing inputs field rejected (HTTP $http_code_missing)"
  else
    log_warning "Unexpected response for missing field (HTTP $http_code_missing)"
  fi

  log_success "Error handling tests completed"
  return 0
}

# Test 7: Connection test
test_connection() {
  log_info "Testing connection to $EMBEDDINGS_HOST..."

  # Extract host and port from URL
  local host=$(echo "$EMBEDDINGS_HOST" | sed -E 's|https?://([^:/]+).*|\1|')
  local port=$(echo "$EMBEDDINGS_HOST" | sed -E 's|https?://[^:]+:?([0-9]+)?.*|\1|')
  port=${port:-80}

  # Test basic connectivity
  if command -v nc &> /dev/null; then
    if nc -z -w 5 "$host" "$port" 2>/dev/null; then
      log_success "Network connection to $host:$port successful"
    else
      log_error "Cannot connect to $host:$port"
      log_error "Check if:"
      log_error "  1. Service is running: ssh root@$host 'docker ps | grep embeddings'"
      log_error "  2. Firewall allows port $port: ssh root@$host 'ufw status | grep $port'"
      log_error "  3. Docker is listening: ssh root@$host 'netstat -tuln | grep $port'"
      return 1
    fi
  else
    log_verbose "nc (netcat) not available, skipping network test"
  fi

  return 0
}

# Main test suite
main() {
  echo ""
  echo "======================================================"
  echo "  Hetzner Embeddings Service Test Suite"
  echo "======================================================"
  echo ""
  echo "Target: $EMBEDDINGS_HOST"
  echo "Expected dimensions: $EXPECTED_DIMENSIONS"
  echo ""

  # Track test results
  local total_tests=0
  local passed_tests=0
  local failed_tests=0

  # Run tests
  check_prerequisites
  echo ""

  # Test connection first
  if test_connection; then
    ((passed_tests++))
  else
    ((failed_tests++))
    log_error "Connection test failed. Aborting remaining tests."
    exit 1
  fi
  ((total_tests++))
  echo ""

  # Test 1: Health check
  if test_health_check; then
    ((passed_tests++))
  else
    ((failed_tests++))
  fi
  ((total_tests++))
  echo ""

  # Test 2: Single embedding
  if test_single_embedding; then
    ((passed_tests++))
  else
    ((failed_tests++))
  fi
  ((total_tests++))
  echo ""

  # Test 3: Batch embedding
  if test_batch_embedding; then
    ((passed_tests++))
  else
    ((failed_tests++))
  fi
  ((total_tests++))
  echo ""

  # Test 4: Performance
  if test_performance; then
    ((passed_tests++))
  else
    ((failed_tests++))
  fi
  ((total_tests++))
  echo ""

  # Test 5: Output validation
  if test_output_validation; then
    ((passed_tests++))
  else
    ((failed_tests++))
  fi
  ((total_tests++))
  echo ""

  # Test 6: Error handling
  if test_error_handling; then
    ((passed_tests++))
  else
    ((failed_tests++))
  fi
  ((total_tests++))
  echo ""

  # Print summary
  echo "======================================================"
  echo "  Test Summary"
  echo "======================================================"
  echo ""
  echo "Total tests:  $total_tests"
  echo -e "${GREEN}Passed:${NC}       $passed_tests"

  if [ $failed_tests -gt 0 ]; then
    echo -e "${RED}Failed:${NC}       $failed_tests"
    echo ""
    echo -e "${YELLOW}Some tests failed. Check the output above for details.${NC}"
    exit 1
  else
    echo ""
    echo -e "${GREEN}All tests passed! ✓${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Update Vercel environment variables:"
    echo "     EMBEDDINGS_API_URL=$EMBEDDINGS_HOST"
    echo "     EMBEDDINGS_DIMENSIONS=$EXPECTED_DIMENSIONS"
    echo "  2. Deploy updated API code"
    echo "  3. Test end-to-end semantic search"
    echo ""
    exit 0
  fi
}

# Run main function
main
