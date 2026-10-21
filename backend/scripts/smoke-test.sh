#!/bin/bash
API="http://localhost:3000"
PASS=0
FAIL=0

test_endpoint() {
  local name=$1
  local method=$2
  local path=$3
  local token=$4
  local data=$5
  
  if [ -z "$data" ]; then
    RESP=$(curl -s -X $method "$API$path" -H "Authorization: Bearer $token" 2>/dev/null)
  else
    RESP=$(curl -s -X $method "$API$path" -H "Content-Type: application/json" -H "Authorization: Bearer $token" -d "$data" 2>/dev/null)
  fi
  
  # Validate JSON
  if echo "$RESP" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
    echo "[PASS] $method $path → 200"
    ((PASS++))
  else
    STATUS=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin) if sys.stdin.read().strip() else {}; print(d.get('statusCode','NO_CODE'))" 2>/dev/null || echo "ERROR")
    echo "[FAIL] $method $path → $STATUS"
    ((FAIL++))
  fi
}

echo "=============================================="
echo "KOVIA API HTTP SMOKE TEST REPORT"
echo "=============================================="
echo ""

# Get tokens
ADMIN_RESP=$(curl -s -X POST "$API/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"admin-1778774350683-7b5ur3@test.kovia.dev","password":"TestPass123"}')
ADMIN_TOKEN=$(echo "$ADMIN_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('accessToken',''))" 2>/dev/null)

ORG_RESP=$(curl -s -X POST "$API/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"org1-1778774350683-aridiq@test.kovia.dev","password":"TestPass123"}')
ORG_TOKEN=$(echo "$ORG_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('accessToken',''))" 2>/dev/null)

SPEC_RESP=$(curl -s -X GET "$API/species" -H "Authorization: Bearer $ORG_TOKEN")
SPECIES_ID=$(echo "$SPEC_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id'] if isinstance(d,list) and d else '')" 2>/dev/null)

TS=$(date +%s%N | cut -b1-13)
ANIMAL_RESP=$(curl -s -X POST "$API/animals" -H "Content-Type: application/json" -H "Authorization: Bearer $ORG_TOKEN" \
  -d "{\"name\":\"TestDog-$TS\",\"speciesId\":\"$SPECIES_ID\",\"ageMonths\":12,\"gender\":\"MALE\",\"breed\":\"Lab\"}")
ANIMAL_ID=$(echo "$ANIMAL_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)

echo "ANIMALS CRUD"
echo "------------"
test_endpoint "Create animal" "POST" "/animals" "$ORG_TOKEN" "{\"name\":\"Dog-$TS\",\"speciesId\":\"$SPECIES_ID\",\"ageMonths\":24,\"gender\":\"FEMALE\",\"breed\":\"Poodle\"}"
test_endpoint "List org animals" "GET" "/animals/org" "$ORG_TOKEN" ""
test_endpoint "Get animal stats" "GET" "/animals/org/stats" "$ORG_TOKEN" ""
test_endpoint "Get specific animal" "GET" "/animals/org/$ANIMAL_ID" "$ORG_TOKEN" ""
test_endpoint "Update animal" "PATCH" "/animals/$ANIMAL_ID" "$ORG_TOKEN" '{"description":"Updated"}'
test_endpoint "Update animal status" "PATCH" "/animals/$ANIMAL_ID/status" "$ORG_TOKEN" '{"status":"AVAILABLE"}'
test_endpoint "Get public animal" "GET" "/animals/$ANIMAL_ID" "$ORG_TOKEN" ""
echo ""

echo "APPLICATIONS"
echo "------------"
test_endpoint "Check application status" "GET" "/applications/check?animalId=$ANIMAL_ID" "$ORG_TOKEN" ""
test_endpoint "Get my applications" "GET" "/applications/my" "$ORG_TOKEN" ""
test_endpoint "Get org applications" "GET" "/applications/org" "$ORG_TOKEN" ""
echo ""

echo "NOTIFICATIONS"
echo "--------------"
test_endpoint "Get notifications" "GET" "/notifications" "$ORG_TOKEN" ""
test_endpoint "Mark all as read" "POST" "/notifications/read-all" "$ORG_TOKEN" ""
echo ""

echo "UPLOAD"
echo "------"
test_endpoint "Get presigned URL" "POST" "/upload/presigned-url" "$ORG_TOKEN" '{"filename":"test.jpg","contentType":"image/jpeg","folder":"animals"}'
echo ""

echo "TEAM"
echo "----"
test_endpoint "Invite team member" "POST" "/team/invites" "$ORG_TOKEN" "{\"email\":\"t-$TS@test.com\",\"role\":\"ORG_STAFF\"}"
test_endpoint "Get team invites" "GET" "/team/invites" "$ORG_TOKEN" ""
test_endpoint "Get team members" "GET" "/team/members" "$ORG_TOKEN" ""
echo ""

echo "ORGANIZATION"
echo "-------------"
test_endpoint "Get my organization" "GET" "/organizations/me" "$ORG_TOKEN" ""
echo ""

echo "ADMIN"
echo "-----"
test_endpoint "Get platform stats" "GET" "/admin/stats" "$ADMIN_TOKEN" ""
test_endpoint "Get all organizations" "GET" "/admin/orgs" "$ADMIN_TOKEN" ""
echo ""

echo "=============================================="
printf "SUMMARY: %d passed, %d failed\n" $PASS $FAIL
echo "=============================================="

[ $FAIL -eq 0 ]
