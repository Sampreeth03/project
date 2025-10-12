# `test_plan.md`

## 1. Sign Up Test Cases

| Case | Input | Expected Result | Actual Result | Status | Screenshot |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Invalid** | `Name: V`, `Email: user@ gmail.com` | Tooltip error message: "A part following '@' should not contain the symbol ' '". | A tooltip error message is shown. | Passed | ![Invalid Signup Case](test_plan/signup_invalid_case.png) |
| **Valid** | `Name: Vi`, `Email: user@gmail.com` | Account created successfully. | A "Login successful" message is shown. | Passed | ![Valid Signup Case](test_plan/signup_valid_case.png) |

---

## 2. Sign In Test Cases

| Case | Input | Expected Result | Actual Result | Status | Screenshot |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Invalid** | `Email: gautam.thota@example.com`, `Password: dlufgsiudfi` | Error message: "Invalid email or password". | A red banner with the text "Invalid email or password" is displayed. | Passed | ![Invalid Signin Case](test_plan/signin_invalid_case.png) |
| **Valid** | `Email: gautam.thota@example.com`, `Password: 123456` | User successfully authenticated. | A green banner with "Login successful" is displayed. | Passed | ![Valid Signin Case](test_plan/signin_valid_case.png) |

---

## 3. Profile Update Test Cases

| Case | Input | Expected Result | Actual Result | Status | Screenshot |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Invalid** | `Phone: 2355` | Alert message: "Please enter a valid 10-digit Indian phone number starting with 9, 8, 7, or 6." | A JavaScript alert appears. | Passed | ![Invalid Profile Case](test_plan/profile_invalid_case.png) |
| **Valid** | `Phone: 7869408765` | Profile updated successfully. | A JavaScript alert appears saying: "Profile updated successfully!". | Passed | ![Valid Profile Case](test_plan/profile_valid_case.png) |

---

## 4. Payment Test Cases

| Case | Input | Expected Result | Actual Result | Status | Screenshot |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Invalid** | `Expiry: 23/34` | Alert message: "Invalid month. Please enter a value between 01 and 12." | A JavaScript alert appears. | Passed | ![Invalid Payment Case](test_plan/payment_invalid_case.png) |
| **Valid** | `Expiry: 12/34` | The form passes validation. | The form submits successfully. | Passed | ![Valid Payment Case](test_plan/payment_valid_case.png) |

---

## 5. Sign Up Test Cases for Shopmanager

| Case | Input | Expected Result | Actual Result | Status | Screenshot |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Invalid** | `Name: Jeevan`, `Email: jeevankumar.vendor@gmail.com`, `Contact Number:9456521365`,`password:12345678`,`confirm password:12345678`,`Store name:Wholesale`,`Store Location:Warangal` | error message: "Please enter a valid 10-digit phone number and Please enter a valid Gmail address(e.g.,example@gmail.com)". | A error message is shown. | Passed | ![Invalid Signup Case](./test_plan/store_signup_invaid.png) |
| **Valid** | `Name: Jeevan`, `Email: jeevankumar.vendor@gmaill.com`, `Contact Number:94565213657`,`password:12345678`,`confirm password:12345678`,`Store name:Wholesale`,`Store Location:Warangal` | Account created successfully. | A "Login successful" message is shown. | Passed | ![Valid Signup Case](./test_plan/store_signup_valid.png) |

---

## 6. Sign In Test Cases for Shopmanager

| Case | Input | Expected Result | Actual Result | Status | Screenshot |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Invalid** | `Email: veda.prakash.vendor@gmaqil.com`, `Password: 12345678`,`Role : Store Manager`| Error message: "Invalid email or password". | A red banner with the text "Invalid email or password" is displayed. | Passed | ![Invalid Signin Case](./test_plan/shop_manager_login_invalid.png) |
| **Valid** | `Email: veda.prakash.vendor@gmail.com`, `Password: 12345678`,`Role : Store Manager`| User successfully authenticated. | A green banner with "Login successful" is displayed. | Passed | ![Valid Signin Case](./test_plan/shop_manager_login_valid.png) |

---

## 7. Profile Update Test Cases for Shopmanager

| Case | Input | Expected Result | Actual Result | Status | Screenshot |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Invalid** | `Email: veda.prakasah.vendor@gmaail.com` | Alert message: "Please use a Valid email from  a valid provider" | A JavaScript alert appears. | Passed | ![Invalid Profile Case](./test_plan/shop_manager_profile_edit_invalid.png) |
| **Valid** | `Email: veda.prakasah.vendor@gmail.com` | Profile updated successfully. | A JavaScript alert appears saying: "Profile updated successfully!". | Passed | ![Valid Profile Case](./test_plan/shop_manager_profile_edit_valid.png) |

---

## 8. Add New product Test Cases

| Case | Input | Expected Result | Actual Result | Status | Screenshot |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Invalid** | `Productname:Pet Scraching Poll`,`Category:Toys`,`Pet Type:Cat`,`Stock Satus:In Stock`,`Description:New Stock`,`Size:medium`,`Regular Price:400`,`Sale price:500`,`Stock Quantity:15` | error message: "Sale price must be less than regular price" | A error message is shown | Passed | ![Invalid Add product Case](./test_plan/adding_product_invalid.png) |
| **Valid** |  `Productname:Pet Scraching Poll`,`Category:Toys`,`Pet Type:Cat`,`Stock Satus:In Stock`,`Description:New Stock`,`Size:medium`,`Regular Price:400`,`Sale price:350`,`Stock Quantity:15` | Product should be added | Product added successfully. | Passed | ![Valid Add product Case](./test_plan/adding_product_valid.png) |

---

## Event Manager Signup Test Cases

| Case | Input | Expected Result | Actual Result | Status | Screenshot |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Invalid** | `Name: J` | Error message: "Name must be at least 2 characters long". | Error message is shown under the name field. | Passed | ![Invalid Name Case](test_plan/eventManager_signup_invalid_case.png) |
| **Valid** | `Name`: John Doe <br> `Contact`: 9876543210 <br> `Email`: john.doe@gmail.com <br> `Password`: password123 <br> `Confirm Password`: password123 <br> `Company`: Doe Events <br> `Location`: Delhi <br> `Terms`: Checked | Form submits successfully and shows a success message. | A "Signup successful! Redirecting..." message is shown. | Passed | ![Valid Signup Case](test_plan/eventManager_signup_invalid_case.png) |

## Sign In Test Cases

| Case | Input | Expected Result | Actual Result | Status | Screenshot |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Invalid** | `Email: john.doe@gmail.co` <br> `Password: wrongpassword` | Error message: "Invalid email or password". | A red banner with "Invalid email or password" is shown. | Passed | ![Invalid Signin Case](/test_plan/eventManager_signin_invalid_case.png) |
| **Valid** | `Email: john.doe@gmail.com` <br> `Password: correctpassword` | User is successfully authenticated and redirected. | A green banner with "Login successful" is shown. | Passed | ![Valid Signin Case](/test_plan//eventManager_signin_valid_case.png) |

## Create New Event Test Cases

| Case | Input | Expected Result | Actual Result | Status | Screenshot |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Invalid** | `Event Name`: Annual Pet Gala <br> `Date and Time`: October 01, 2025, 12:00 pm| Alert message: "⚠️ Please select a future date and time for your event." | A JavaScript alert appears with the future date error. | Passed | ![Invalid Event Date](/test_plan/create_event_invalid_case.png) |
| **Valid** | `Event Name`: Annual Pet Gala <br> `Date and Time`: October 25, 2025, 10:00 AM <br> (All other fields validly filled) | Alert message: "🎉 Event created successfully!" followed by a page reload. | A success alert is shown, and the page reloads. | Passed | ![Valid Event Case](/test_plan/create_event_valid_case.png) |

# Test Plan for Happy Tails Platform

## 1. Event Manager Profile Test Cases

| Case | Input | Expected Result | Actual Result | Status | Screenshot |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Invalid** | `Email`: john.doe@gmail.co | Alert message: "Please enter a valid Gmail address." | A JavaScript alert appears with the validation error. | Passed | ![Invalid Profile Email](/test_plan/eventManager_profile_invalid_email_case.png) |
| **Valid** | All fields filled with valid data. | Profile updates successfully without errors. | The modal closes and the profile information is updated on the dashboard. | Passed | ![Valid Profile Update](/test_plan/eventManager_profile_valid_email_case.png) |

---
## 3. Update Existing Event Test Cases

| Case | Input | Expected Result | Actual Result | Status | Screenshot |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Invalid** | `Date`: October 1, 2025 | Alert message: "Please select a future date and time for your event." | A JavaScript alert appears with the future date error. | Passed | ![Invalid Event Update Date](/test_plan/update_event_invalid_date_case.png) |
| **Valid** | All fields updated with valid data. | The event details are saved successfully without any errors. | The form is saved and the event information is updated. | Passed | ![Valid Event Update](/test_plan/update_event_valid_case.png) |

---

## 4. Edit Attendee Test Cases

| Case | Input | Expected Result | Actual Result | Status | Screenshot |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Invalid** | `Phone No`: 123456789 | Alert message: "Please enter a valid 10-digit phone number." | A JavaScript alert appears with the phone number validation error. | Passed | ![Invalid Attendee Phone](/test_plan/edit_attendee_invalid_phone_case.png) |
| **Valid** | `Name`: akshay <br> `Phone No`: 1234567890 | Attendee information is saved successfully. | The modal closes and the attendee list shows the updated information. | Passed | ![Valid Attendee Edit](/test_plan/edit_attendee_valid_case.png) |

---

## 5. Book Event Test Cases (User View)

| Case | Input | Expected Result | Actual Result | Status | Screenshot |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Invalid** | `Email Address`: akshay@gmail | Alert message: "Please enter a valid email address." | A JavaScript alert appears with the email validation error. | Passed | ![Invalid Booking Email](/test_plan/book_event_invalid_case.png) |
| **Valid** | All personal and booking details filled correctly. | The user proceeds to the payment page without validation errors. | The form is validated, and the "Proceed to Payment" button becomes active. | Passed | ![Valid Booking Form](/test_plan/book_event_valid_case.png) |

--- 

## 6. DOM Validation Test Cases - Login Page 

| Case | Input | Expected Result | Actual Result | Status | Screenshot |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Invalid Email Format** | `Email: john@gm` | Placeholder shows "Invalid email format" in red. Button remains disabled. | Placeholder turns red with error message. Sign In button stays disabled with opacity 0.5. | Passed | ![Invalid Email](test_plan/login_invalid_email.png) |
| **Empty Email** | Email field left empty, user clicks outside | Placeholder shows "Email is required" in red with shake animation. | Error message appears with shake effect. Button disabled. | Passed | ![Empty Email](test_plan/login_empty_email.png) |
| **Invalid Password** | `Password: 12345` | Placeholder shows "Password must be at least 6 characters" in red. | Error message displays. Button remains disabled. | Passed | ![Invalid Password](test_plan/login_invalid_password.png) |
| **Caps Lock Warning** | User types with Caps Lock ON | Warning message "⚠️ Caps Lock is ON" appears below password field. | Warning displays in real-time. | Passed | ![Caps Lock Warning](test_plan/login_caps_lock.png) |
| **Email Domain Suggestions** | `Email: john@gm` | Dropdown suggests: gmail.com, gmx.com with clickable options. | Suggestion list appears below email field. | Passed | ![Email Suggestions](test_plan/login_email_suggestions.png) |
| **Valid Credentials** | `Email: john@gmail.com`, `Password: Pass@123` | All errors clear. Sign In button becomes enabled (opacity 1, cursor pointer). | Button enabled. Form submits successfully. | Passed | ![Valid Login](test_plan/login_valid.png) |

---

## 7. DOM Validation Test Cases - Signup Page 

| Case | Input | Expected Result | Actual Result | Status | Screenshot |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Empty Name** | Name field left empty, user clicks outside | Placeholder shows "Name is required" in red. Sign Up button disabled. | Error message appears. Button stays disabled. | Passed | ![Empty Name](test_plan/signup_empty_name.png) |
| **Short Name** | `Name: A` | Placeholder shows "Name must be at least 2 characters" in red with shake animation. | Error displays with shake animation. | Passed | ![Short Name](test_plan/signup_short_name.png) |
| **Invalid Email** | `Email: user@` | Placeholder shows "Invalid email format" in red. | Error message appears immediately on blur. | Passed | ![Invalid Email](test_plan/signup_invalid_email.png) |
| **Weak Password** | `Password: pass` | Password strength meter shows "Weak" in red. Placeholder error appears. | Strength meter displays red bar with "Weak" label. Button disabled. | Passed | ![Weak Password](test_plan/signup_weak_password.png) |
| **Medium Password** | `Password: Pass123` | Password strength meter shows "Medium" in orange. | Orange bar displays with "Medium" label. Still requires special character. | Passed | ![Medium Password](test_plan/signup_medium_password.png) |
| **Strong Password** | `Password: Pass@123` | Password strength meter shows "Strong" in green. | Green bar displays with "Strong" label. Password field valid. | Passed | ![Strong Password](test_plan/signup_strong_password.png) |
| **Password Mismatch** | `Password: Pass@123`, `Confirm: Pass@124` | Confirm password shows "❌ Passwords do not match" in red. | Red mismatch indicator appears. Button disabled. | Passed | ![Password Mismatch](test_plan/signup_password_mismatch.png) |
| **Password Match** | `Password: Pass@123`, `Confirm: Pass@123` | Confirm password shows "✓ Passwords match" in green. | Green match indicator appears. | Passed | ![Password Match](test_plan/signup_password_match.png) |
| **Unchecked Terms** | All fields valid but terms checkbox unchecked | Button remains disabled. Alert: "Please accept terms and conditions". | Cannot submit. Alert shows on attempt. | Passed | ![Unchecked Terms](test_plan/signup_unchecked_terms.png) |
| **Valid Signup** | `Name: John Doe`, `Email: john@gmail.com`, `Password: Pass@123`, `Confirm: Pass@123`, Terms checked | All errors clear. Sign Up button enabled. Progress: "Step 4 of 4 Complete". | Button enabled. Account created successfully. Redirects to home page. | Passed | ![Valid Signup](test_plan/signup_valid.png) |

---

## 8. DOM Validation Test Cases - Recruiter Signup Page 

| Case | Input | Expected Result | Actual Result | Status | Screenshot |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Empty Name** | Name field left empty, user clicks outside | Placeholder shows "Name is required" in red with shake. | Error message appears with shake animation. | Passed | ![Empty Name](test_plan/recruiter_signup_empty_name.png) |
| **Invalid Email** | `Email: recruiter@` | Placeholder shows "Invalid email format" in red. | Error displays immediately on blur. | Passed | ![Invalid Email](test_plan/recruiter_signup_invalid_email.png) |
| **Weak Password** | `Password: weak` | Password strength meter shows "Weak" in red. Button disabled. | Red strength bar displays. Validation fails. | Passed | ![Weak Password](test_plan/recruiter_signup_weak_password.png) |
| **Strong Password** | `Password: Recruit@123` | Password strength meter shows "Strong" in green. | Green bar displays with "Strong" label. Field valid. | Passed | ![Strong Password](test_plan/recruiter_signup_strong_password.png) |
| **Password Mismatch** | `Password: Recruit@123`, `Confirm: Recruit@124` | Confirm shows "❌ Passwords do not match" in red. | Red mismatch indicator appears. | Passed | ![Password Mismatch](test_plan/recruiter_signup_password_mismatch.png) |
| **Password Match** | `Password: Recruit@123`, `Confirm: Recruit@123` | Confirm shows "✓ Passwords match" in green. | Green match indicator displays. | Passed | ![Password Match](test_plan/recruiter_signup_password_match.png) |
| **With Verification File** | User uploads PDF/DOC verification file | File name displays below upload button. No validation error. | File accepted and file name shown. | Passed | ![With File](test_plan/recruiter_signup_with_file.png) |
| **Unchecked Terms** | All fields valid but terms unchecked | Submit button disabled. Alert on submission attempt. | Cannot submit until terms checked. | Passed | ![Unchecked Terms](test_plan/recruiter_signup_unchecked_terms.png) |
| **Valid Recruiter Signup** | `Name: Jane Recruiter`, `Email: jane@company.com`, `Password: Recruit@123`, `Confirm: Recruit@123`, File uploaded, Terms checked | All validations pass. Sign Up button enabled. Progress: "Step 4 of 4 Complete". | Button enabled. Recruiter account created. Redirects to recruiter home. | Passed | ![Valid Signup](test_plan/recruiter_signup_valid.png) |

---

## 9. DOM Validation Test Cases - Create Project Page 

| Case | Input | Expected Result | Actual Result | Status | Screenshot |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Empty Project Name** | Project name field left empty, user clicks outside | Inline error message: "Project name is required" appears below field in red. | Error displays below input field. Button disabled. | Passed | ![Empty Name](test_plan/create_project_empty_name.png) |
| **Short Project Name** | `Project Name: AB` | Inline error: "Project name must be at least 3 characters". | Error message appears below field. Validation fails. | Passed | ![Short Name](test_plan/create_project_short_name.png) |
| **Long Project Name** | `Project Name:` (101 characters) | Inline error: "Project name must be less than 100 characters". | Error displays with character count exceeded. | Passed | ![Long Name](test_plan/create_project_long_name.png) |
| **Empty Description** | Description field left empty | Inline error: "Description is required" appears in red below textarea. | Error message shown. Character counter shows "0/500". | Passed | ![Empty Description](test_plan/create_project_empty_description.png) |
| **Short Description** | `Description: Short` | Inline error: "Description must be at least 10 characters". Counter shows "5/500" in red. | Error displays with live character count. | Passed | ![Short Description](test_plan/create_project_short_description.png) |
| **Valid Description** | `Description:` (50 characters of valid text) | Character counter shows "50/500" in green. No error message. | Counter updates in real-time in green color. Validation passes. | Passed | ![Valid Description](test_plan/create_project_valid_description.png) |
| **Long Description** | `Description:` (501 characters) | Inline error: "Description cannot exceed 500 characters". Counter shows "501/500" in red. | Error displays. Counter turns red exceeding limit. | Passed | ![Long Description](test_plan/create_project_long_description.png) |
| **Invalid Capacity** | `Capacity: 0` | Inline error: "Capacity must be between 1 and 100". | Error message appears below capacity field. | Passed | ![Invalid Capacity](test_plan/create_project_invalid_capacity.png) |
| **No Topic Selected** | Topic dropdown left at default "Select a topic" | Inline error: "Please select a project topic". | Error appears on blur. Button disabled. | Passed | ![No Topic](test_plan/create_project_no_topic.png) |
| **Empty Start Date** | Start date field left empty | Inline error: "Start date is required" below date field. | Error displays in red. | Passed | ![Empty Start Date](test_plan/create_project_empty_start_date.png) |
| **Past Start Date** | `Start Date: 2024-01-01` | Inline error: "Start date must be today or in the future". | Error displays. Past dates rejected. | Passed | ![Past Start Date](test_plan/create_project_past_start_date.png) |
| **End Before Start** | `Start: 2025-10-20`, `End: 2025-10-15` | Inline error: "End date must be after start date". | Date validation error appears below end date. | Passed | ![End Before Start](test_plan/create_project_end_before_start.png) |
| **Valid Project** | `Name: RelabTeams Project`, `Description:` (50 valid chars), `Capacity: 5`, `Topic: Web Development`, `Start: 2025-10-20`, `End: 2025-12-31` | All errors clear. Character counter green "50/500". Create Project button enabled (opacity 1). | Button enabled. Project created successfully. Redirects to projects page. | Passed | ![Valid Project](test_plan/create_project_valid.png) |

