      # Quick Testing Guide for Advanced DOM Features

## How to Test Each Feature

### 🔹 login.ejs Features

#### 1. Caps Lock Warning
**Test Steps:**
1. Navigate to `/login`
2. Click in the password field
3. Turn on Caps Lock on your keyboard
4. Type any character
5. **Expected:** A "⇪ Caps Lock" warning appears in red/orange
6. Turn off Caps Lock
7. **Expected:** Warning disappears

#### 2. Email Domain Suggestions
**Test Steps:**
1. Navigate to `/login`
2. In email field, type: `test@g`
3. **Expected:** Suggestion appears: "Did you mean test@gmail.com?"
4. Continue typing: `test@gm`
5. **Expected:** Still shows "Did you mean test@gmail.com?"
6. Click the suggestion
7. **Expected:** Email field auto-fills with `test@gmail.com`
8. Try with other domains: `@y` (yahoo), `@o` (outlook), `@h` (hotmail), `@i` (icloud)

#### 3. Focus Glow Effect
**Test Steps:**
1. Navigate to `/login`
2. Click in email field
3. **Expected:** Animated gradient glow appears around input (blue gradient)
4. Click outside or press Tab
5. **Expected:** Glow fades away
6. Repeat with password field

#### 4. Shake Animation on Error
**Test Steps:**
1. Navigate to `/login`
2. Leave email blank and click password field (blur email)
3. **Expected:** Email field shakes horizontally
4. Enter invalid email like `test` (no @)
5. Click outside
6. **Expected:** Email field shakes
7. Try submitting with invalid credentials
8. **Expected:** Invalid fields shake

---

### 🔹 signup.ejs Features

#### 1. Form Progress Indicator
**Test Steps:**
1. Navigate to `/signup`
2. **Initial State:** "Step 0 of 4 completed", progress bar at 0%
3. Fill name field with valid name (e.g., "John Doe")
4. Click outside
5. **Expected:** "Step 1 of 4 completed", progress bar at 25%
6. Fill valid email
7. **Expected:** "Step 2 of 4 completed", progress bar at 50%
8. Fill valid password (6+ chars, uppercase, special char)
9. **Expected:** "Step 3 of 4 completed", progress bar at 75%
10. Fill matching confirm password
11. **Expected:** "Step 4 of 4 completed", progress bar at 100%

#### 2. Password Strength Meter
**Test Steps:**
1. Navigate to `/signup`
2. Click in password field
3. Type: `abc` (weak)
4. **Expected:** Red bar at ~33%, "Weak password" text
5. Type: `Abc123` (medium)
6. **Expected:** Orange bar at ~66%, "Medium strength" text
7. Type: `Abc123!@` (strong)
8. **Expected:** Green bar at 100%, "Strong password" text

#### 3. Password Match Indicator
**Test Steps:**
1. Navigate to `/signup`
2. In password field, type: `Test123!`
3. In confirm password field, type: `Test`
4. **Expected:** Red "✗ Passwords do not match" appears
5. Continue typing: `Test123!`
6. **Expected:** Green "✓ Passwords match" appears

#### 4. Focus Glow (All Fields)
**Test Steps:**
1. Navigate to `/signup`
2. Click each field (name, email, password, confirm)
3. **Expected:** Each field gets animated gradient glow when focused
4. Click outside
5. **Expected:** Glow disappears

#### 5. Shake Animation on Errors
**Test Steps:**
1. Navigate to `/signup`
2. Click name field, then click outside (leave empty)
3. **Expected:** Name field shakes
4. Enter invalid email and click outside
5. **Expected:** Email field shakes
6. Try submitting with multiple invalid fields
7. **Expected:** All invalid fields shake simultaneously

---

### 🔹 signupforrec.ejs Features

**All features from signup.ejs apply to signupforrec.ejs**

**Test Steps:**
1. Navigate to `/signupforrec` (or recruiter signup page)
2. Test all features exactly as described for signup.ejs:
   - Form progress indicator
   - Password strength meter
   - Password match indicator
   - Focus glow effects
   - Shake animations
3. Additionally test that file upload field is NOT affected by new features

---

### 🔹 create_proj.ejs Features

#### 1. Character Counter with Color Coding
**Test Steps:**
1. Navigate to project creation page (`/e` or `/create-project`)
2. In title field, start typing
3. **Expected:** Counter shows "5/100" (or current count)
4. Type until 0-50 characters
5. **Expected:** Counter is GREEN
6. Type until 50-80 characters
7. **Expected:** Counter turns YELLOW
8. Type until 80-100 characters
9. **Expected:** Counter turns RED
10. Same behavior for description field (0/500)

#### 2. Validation Checkmarks
**Test Steps:**
1. Navigate to project creation page
2. Fill title with 3+ characters
3. Click outside
4. **Expected:** Green ✓ appears to the right of title field
5. Clear title to less than 3 characters
6. Click outside
7. **Expected:** Checkmark disappears
8. Test same behavior for:
   - Capacity (3-20)
   - Topic (any non-empty value)
   - Deadline (future date)

#### 3. Contextual Hints on Focus
**Test Steps:**
1. Navigate to project creation page
2. Click in title field
3. **Expected:** "💡 Use a clear, descriptive title" appears below
4. Click outside
5. **Expected:** Hint disappears
6. Test other fields:
   - Description: "📝 Describe your project goals and requirements"
   - Capacity: "👥 3-20 members recommended"
   - Deadline: "📅 Must be a future date"

#### 4. Interactive +/- Capacity Buttons
**Test Steps:**
1. Navigate to project creation page
2. Default capacity should be 3
3. Click the **−** button
4. **Expected:** Button is disabled (capacity already at minimum)
5. Click the **+** button multiple times
6. **Expected:** Capacity increases (4, 5, 6...)
7. Click **+** until capacity reaches 20
8. **Expected:** **+** button becomes disabled
9. Click **−** button
10. **Expected:** Capacity decreases, **+** button re-enables

#### 5. Auto-Save with Draft Restoration
**Test Steps:**
1. Navigate to project creation page
2. Fill any field (e.g., title: "Test Project")
3. Wait 1-2 seconds
4. **Expected:** "💾 Draft saved" notification appears briefly bottom-right
5. Fill more fields (description, capacity, etc.)
6. Wait for auto-save notification
7. Refresh the page (F5)
8. **Expected:** All previously entered data is restored automatically
9. Wait 24 hours (or manually clear localStorage)
10. Refresh page
11. **Expected:** Draft is cleared (24-hour expiry)

**To Manually Test Draft Expiry:**
1. Open browser DevTools (F12)
2. Go to Application tab → Local Storage
3. Find `projectDraft` key
4. Edit `timestamp` value to 24+ hours ago (subtract 86400000 from current timestamp)
5. Refresh page
6. **Expected:** Draft is not restored

#### 6. Focus Glow Effects
**Test Steps:**
1. Navigate to project creation page
2. Click each field (title, description, capacity, topic, deadline)
3. **Expected:** Gradient glow animation around each focused field
4. Press Tab or click outside
5. **Expected:** Glow fades away

#### 7. Shake Animation on Errors
**Test Steps:**
1. Navigate to project creation page
2. Leave title empty and click outside
3. **Expected:** Title field shakes
4. Enter capacity less than 3 or more than 20
5. Click outside
6. **Expected:** Capacity field shakes
7. Try submitting with multiple invalid fields
8. **Expected:** All invalid fields shake

---

## Cross-Browser Testing

Test in multiple browsers:
- ✅ Chrome
- ✅ Firefox
- ✅ Edge
- ✅ Safari (if on Mac)

## Mobile Testing

Test on mobile devices or using browser DevTools mobile emulation:
- Touch events for +/- buttons
- Focus states on touch
- All animations smooth
- Progress bars visible
- No horizontal scrolling

---

## Common Issues & Troubleshooting

### Issue: Caps Lock warning not appearing
**Solution:** Some browsers don't support `getModifierState`. Feature degrades gracefully.

### Issue: Email suggestions not working
**Check:**
- Type after `@` symbol
- Use common domains: gmail, yahoo, outlook, hotmail, icloud
- Ensure partial match (e.g., `@g` matches `gmail.com`)

### Issue: Auto-save not working
**Check:**
- Wait at least 1 second after typing (debounce delay)
- Check browser console for errors
- Verify localStorage is enabled (not in private/incognito mode)
- Check DevTools → Application → Local Storage for `projectDraft` key

### Issue: Progress bar not updating
**Check:**
- Fields must be VALID for progress to increment
- Just filling a field isn't enough - must pass validation
- Test with valid data (e.g., email needs @, password needs uppercase + special)

### Issue: Checkmarks not appearing
**Check:**
- Must blur (click outside) field after filling
- Field must be VALID (meets all criteria)
- Check console for JavaScript errors

---

## Performance Testing

### Check Animation Smoothness
1. Open DevTools → Performance tab
2. Start recording
3. Trigger animations (focus fields, type, blur)
4. Stop recording
5. **Expected:** No dropped frames, smooth 60fps

### Check localStorage Performance
1. Open DevTools → Application → Local Storage
2. Fill project form
3. Wait for auto-save
4. **Expected:** `projectDraft` key appears with JSON data
5. Check data structure includes: title, description, capacity, topic, deadline, timestamp

---

## Accessibility Testing

### Keyboard Navigation
1. Press Tab to navigate through all fields
2. **Expected:** Clear focus indicators (glow effects)
3. Press Enter to submit forms
4. **Expected:** Validation errors announced

### Screen Reader Testing
1. Enable screen reader (NVDA, JAWS, VoiceOver)
2. Navigate through forms
3. **Expected:**
   - Error messages announced via ARIA live regions
   - Button states announced (disabled/enabled)
   - Field labels read correctly

---

## Summary Checklist

### login.ejs
- [ ] Caps Lock warning
- [ ] Email domain suggestions
- [ ] Focus glow (2 fields)
- [ ] Shake animation on errors
- [ ] Click-outside hides suggestions

### signup.ejs
- [ ] Form progress bar (0-100%)
- [ ] Password strength meter (weak/medium/strong)
- [ ] Password match indicator (✓/✗)
- [ ] Focus glow (4 fields)
- [ ] Shake animation (4 fields)

### signupforrec.ejs
- [ ] Same as signup.ejs
- [ ] File upload unaffected

### create_proj.ejs
- [ ] Character counter (2 fields, color-coded)
- [ ] Validation checkmarks (4 fields)
- [ ] Contextual hints (4 fields)
- [ ] +/- capacity buttons
- [ ] Auto-save with notification
- [ ] Draft restoration
- [ ] Focus glow (5 fields)
- [ ] Shake animation (5 fields)

---

## Total Features to Test: 30+

**Estimated Testing Time:** 30-45 minutes for comprehensive testing

**Priority Testing:**
1. **High:** Auto-save, password strength, form progress
2. **Medium:** Shake animations, focus glow, checkmarks
3. **Low:** Caps Lock warning, email suggestions (progressive enhancement)
