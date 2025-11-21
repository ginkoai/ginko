#!/bin/bash
# Monitor Vercel deployment status

echo "Monitoring deployment status..."
DEPLOYMENT_ID="lhnqqhgng"

for i in {1..20}; do
  echo ""
  echo "Check $i/20 ($(date +%H:%M:%S)):"

  cd /Users/cnorton/Development/ginko/dashboard
  STATUS=$(vercel ls 2>/dev/null | grep "$DEPLOYMENT_ID" | head -1)

  echo "$STATUS"

  if echo "$STATUS" | grep -q "● Ready"; then
    echo ""
    echo "✓ Deployment Ready!"
    exit 0
  elif echo "$STATUS" | grep -q "● Error"; then
    echo ""
    echo "✗ Deployment Failed!"
    vercel logs "$DEPLOYMENT_ID" --limit 20
    exit 1
  fi

  sleep 5
done

echo ""
echo "⚠ Deployment still building after 100s"
exit 2
