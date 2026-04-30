#!/bin/bash
URL="http://localhost:3000/api/convert"
TEST_FILE="test.webp"
DURATION=10
CONCURRENT=10

echo "Running stress test: ${DURATION}s, ${CONCURRENT} concurrent connections"
echo "---"

end_time=$(($(date +%s) + DURATION))

total=0
success=0
client_error=0
server_error=0

while [ $(date +%s) -lt $end_time ]; do
  for i in $(seq 1 $CONCURRENT); do
    {
      status=$(curl -s -o /dev/null -w "%{http_code}" -F "file=@$TEST_FILE" -F "format=png" $URL 2>/dev/null)
      case $status in
        2*) ((success++)) ;;
        4*) ((client_error++)) ;;
        5*) ((server_error++)) ;;
      esac
      ((total++))
    } &
  done
  wait
done

elapsed=$DURATION
tps=$((total / elapsed))

echo ""
echo "Results after ${elapsed}s:"
echo "Total requests: $total"
echo "2xx (success): $success"
echo "4xx (client error): $client_error"
echo "5xx (server error): $server_error"
echo "Avg throughput: $tps req/sec"
