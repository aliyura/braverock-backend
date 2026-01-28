export enum Messages {
  // -------------------------
  // GENERAL / SYSTEM
  // -------------------------
  Exception = 'Something went wrong',
  UnableToSendSMS = 'Unable to send SMS, consider funding your wallet',
  InvalidAuthToken = 'Invalid authentication token',
  unableToUploadFile = 'Unable to upload file',
  fileTooLarge = 'File too large',
  RequestSuccessful = 'Request successful',
  SearchNotFound = 'Search not found',
  InvalidCredentials = 'Invalid username or password',
  UserNotFound = 'User not found',
  NoAnalyticFound = 'No analytic data found',
  NoUserFound = 'No user found',
  NoChatFound = 'No chat found',
  UnableToSendEmail = 'Unable to send email',
  NoMessageFound = 'No messages found',
  MessageNotFound = 'Message not found',
  NoNotificationFound = 'No notification found',
  AnalyticNotAvailable = 'Analytic not available',
  UserAlreadyExist = 'User already exist',
  UserWithEmailAlreadyExist = 'User with this email already exist',
  UserWithPhoneAlreadyExist = 'User with this phone number already exist',
  UserWithUsernameAlreadyExist = 'User with this username already exist',
  NoPermission = 'You are not authorized to perform this operation',
  NoPermissionToResources = 'You are not authorized to access this resources',
  EmailSentSuccessful = 'Email sent successfully',
  NotificationSentSuccessfully = 'Notification sent successfully',
  OTPSubject = 'Verification Code',
  OTPMessage = 'Your OTP is ',
  OTPSent = 'Verification code has been sent to your Email and Phone number',
  DeletedSuccessfully = 'Deleted successfully',
  UpdatedSuccessfully = 'Updated successfully',
  Updated = 'Updated',
  AddedSuccessfully = 'Added successfully',

  // -------------------------
  // ANNOUNCEMENTS / NEWS
  // -------------------------
  AnnouncementNotAvailable = 'Announcement not available',
  NoAnnouncementFound = 'No announcement found',
  NewsNotAvailable = 'News not available',
  NoNewsFound = 'No news found',

  // -------------------------
  // AUTH / ACCOUNT
  // -------------------------
  AccountVerified = 'Account verified successfully',
  InvalidOtp = 'Invalid OTP',

  // -------------------------
  // PROPERTY / SALES / MATERIAL / PAYMENT / ESTATES
  // -------------------------
  HouseListingNotAvailable = 'House listing not available',
  NoPropertiesFound = 'No property found',
  OfferNotAvailable = 'Offer not available',
  NoOffersFound = 'No offer found',
  FaqNotAvailable = 'FAQ not available',
  NoFaqFound = 'No FAQ found',
  NoContactFound = 'No conversation found',
  AlreadySubscribed = 'You have already subscribed to our newsletter',
  ExpenseNotAvailable = 'Expense not available',
  NoExpenseFound = 'No expenses found',
  DebtNotAvailable = 'Debt not available',
  NoDebtFound = 'No debt found',
  NoDebtPaymentFound = 'No debt payment found',
  DebtPaymentNotAvailable = 'Debt payment not available',
  SaleAmountIsZero = 'Sale amount is zero',
  SaleBalanceIsZero = 'Sale balance is zero',
  PayableAmountRequired = 'Payable amount is required',
  MinimumDepositAmountRequired = 'Minimum deposit amount required',
  NoMaterialTypeFound = 'No material type found',
  MaterialTypeNotAvailable = 'Material type not available',
  EstateNotAvailable = 'Estate not available',
  NoEstateFound = 'No estate found',
  MaterialNotAvailable = 'Material not available',
  NoMaterialFound = 'No material found',
  MaterialRequestNotAvailable = 'Material request not available',
  CantModifyReleasedRequest = 'Cannot modify released request',
  CantDeleteReleasedRequest = 'Cannot delete released request',
  NoMaterialRequestFound = 'No material request found',
  SuperAdminAlreadyExist = 'Super admin already exist',
  SiteEngineerNotFound = 'Site engineer not found',
  AllocationNotAvailable = 'Allocation not available',
  AllocationAmountIsZero = 'Allocation amount is zero',
  AllocationBalanceIsZero = 'Allocation balance is zero',
  NoAllocationFound = 'No allocation found',
  NoPaymentFound = 'No payment found',
  PaymentNotFound = 'Payment not found',
  UnableToUpdateRequestStatus = 'Unable to update request status',
  InvalidStatus = 'Invalid status',
  UnableToAllocatePendingSale = 'Unable to create allocation on pending sale',
  HouseNotAvailable = 'House not available',
  HouseNotFound = 'House not found',
  SaleNotAvailable = 'Sale not available',
  NoSaleFound = 'No sale found',
  SaleNotFound = 'Sale not found',
  BillNotAvailable = 'Bill not available',
  NoBillFound = 'No bill found',
  StatusChanged = 'Status changed successfully',
  ScheduleNotAvailable = 'Schedule not available',
  NoScheduleFound = 'No schedule found',
  InvalidParentFolder = 'Invalid parent folder',
  FileNotFound = 'File not found',
  EstateNotFound = 'Estate not found',
  FolderAlreadyExist = 'Folder or file with same name already exist',
  NoFileFound = 'No file found',
  UnableToDeleteFile = 'Unable to delete file',
  FileNamedSuccessfully = 'File renamed successfully',
  ComplaintNotAvailable = 'Complaint not available',
  NoComplaintFound = 'No complaint found',
  ComplaintNotFound = 'Complaint not found',
  InspectionRequestNotAvailable = 'Inspection request not available',
  InspectionRequestNotFound = 'Inspection request not found',
  NoInspectionRequestFound = 'No inspection request found',
  LayoutNotAvailable = 'Layout not available',
  NoLayoutFound = 'No layout found',
  PlotNotAvailable = 'Plot not available',
  NoPlotFound = 'No plot found',
  PlotAlreadyExist = 'Plot already exist',
  PropertyAlreadyReservedByThisClient = 'This client has already reserved this property',
  PropertyAlreadyReserved = 'Property already reserved by another client',
  PropertyNotFound = 'Property not found',
  NoHousesFound = 'No houses found',
  NoReservationFound = 'No reservation found',
  PropertyNotAvailableForReservation = 'Property not available for reservation',
  ReservationNotFound = 'Reservation not found',
  PropertyNotInReservedState = 'Property not in reservation state',
  ReservationCanceledSuccessfully = 'Reservation canceled successfully',
  EstateAlreadyExist = 'Estate already exist',
  HouseAlreadyExist = 'House already exist',
  ClientNotFound = 'Client not found or invalid client id',
  NoClientDetailsAvailable = 'No client details available',
  InvalidPropertyType = 'Invalid property type',
  PropertyNotAvailableForSale = 'Property not available for sale',
  ClintDetailsNotAvailable = 'Client details not available',
  SaleNotInPendingState = 'Sale not in pending state',
  ReservationDetailsNotFound = 'Reservation details not found',
  PropertyReservedByAnotherClient = 'Property reserved by another client',
  FileProcessingFailed = 'Data processing failed, check the data and retry',
  DataNotFullyProcessed = 'Data not fully processed, there is an error in some rows',
  InvalidReservationCode = 'Invalid reservation code or expired',
  PropertyReservedByAnotherUser = 'Transaction failed: This property is currently reserved by another client',
  OfferAlreadyExistOnThisProperty = 'Offer already exists on the selected property',
  NoSiteEngineerAssigned = 'No site engineer assigned to this estate',
  MaterialRequestNotInPendingState = 'The material request is currently not in pending state',
  MaterialRequestNotInApprovedState = 'The material request has not been approved for release',
  MaterialSupplyRequestNotAvailable = 'Material supply request is not available',
  CantModifySuppliedRequest = 'Cannot modify this material supply request',
  MaterialSupplyRequestNotInPendingState = "The material supply request isn't in pending state",
  MaterialSupplyRequestNotInApprovedState = "The material supply request isn't approved",
  NoMaterialSupplyRequestFound = 'No material supply request found',
  CantModifyQuantityOfSupply = 'Cannot modify quantity of material; create a new supply instead',

  // -------------------------
  // ACCOUNT / FUNDS
  // -------------------------
  AccountNotFound = 'Account not found',
  InvalidTransactionType = 'Invalid transaction type',
  NoAccountFound = 'No account found',
  FailedToUpdateUserAccount = 'Failed to update user account',
  FundRequestNotAvailable = 'Fund request not available',
  NoFundRequestFound = 'No fund request found',
  FundRequestNotFound = 'Fund request not found',

  // -------------------------
  // INCIDENTS
  // -------------------------
  IncidentNotAvailable = 'Incident not available',
  NoIncidentFound = 'No incident found',
  IncidentNotFound = 'Incident not found',

  // -------------------------
  // INVESTMENTS
  // -------------------------
  NoInvestmentFound = 'No investment found',
  InvestmentNotFound = 'Investment not found',
  InvestmentCannotBeExtended = 'Investment cannot be extended',
  InvestmentNotInPendingState = 'Investment not in pending state',
  InvestmentCannotBeDeleted = 'Investment cannot be deleted',
  ClientDetailsRequired = 'Client details required',
  NoSettlementFound = 'No settlement found',
  SettlementNotFound = 'Settlement not found',
  SettlementCancelled = 'Settlement cancelled',
  InvestmentNotInActiveState = 'Investment not in active state',
  NoClosureFound = 'No closure found',
  InvestmentClosureNotFound = 'Investment closure not found',
  ClosureCancelled = 'Closure cancelled successfully',
  InvestmentNotEligibleForClosure = 'Investment not eligible for closure',
  NoPaymentPlanFound = 'No payment plan found',
  PaymentPlanNotFound = 'Payment plan not found',

  // -------------------------
  // CONTACTS / THREADS / CHAT
  // -------------------------
  NoContactsFound = 'No contact found',
  ContactNotAvailable = 'Contact not available',
  ContactAlreadyExists = 'Contact already exists',
  NotFound = 'Not found',
  NoBroadcastFound = 'No broadcast found',
  BroadcastPublished = 'Broadcast published',
  ContactGroupAlreadyExist = 'Another contact group already exists with this name',
  ContactGroupNotAvailable = 'Contact group not available',
  NoContactGroupsFound = 'No contact groups found',
  NoRecordFound = 'No record found',
  RecordNotFound = 'Record not found',
  MarkedAsRead = 'Marked as read',
  LeftGroup = 'Left group',
  Forwarded = 'Forwarded',
  Unpinned = 'Unpinned',
  PinnedSuccessfully = 'Pinned successfully',
  CannotRemoveLastAdmin = 'Cannot remove last admin',
  ThreadNotFound = 'Thread not found',

  // -------------------------
  // HR: EMPLOYEES / LEAVE
  // -------------------------
  EmployeeNotFound = 'Employee not found',
  NoEmployeeFound = 'No employee found',
  EmplyeeAlreadyExist = 'Employee already exists',
  LeaveNotFound = 'Leave not found',
  NoLeaveFound = 'No leave found',
  PayrollNotFound = 'Payroll not found',
  NoPayrollFound = 'No payroll found',

  // -------------------------
  // HR: QUERY LETTER
  // -------------------------
  QueryLetterIssued = 'Query letter issued successfully.',
  QueryLetterIssuedBody = 'A new query letter has been issued to you. Kindly review and respond accordingly.', // email body

  QueryLetterAcknowledged = 'Query letter acknowledged successfully.',
  QueryLetterAcknowledgedBody = 'The query letter has been acknowledged by the employee.', // email body

  QueryLetterRevoked = 'Query letter revoked successfully.',
  QueryLetterRevokedBody = 'The query letter previously issued to you has been revoked by HR.', // email body

  QueryLetterUpdated = 'Query letter updated successfully.',
  QueryLetterUpdatedBody = 'Your query letter has been updated by HR.', // email body

  QueryLetterDeleted = 'Query letter deleted successfully.',

  QueryNotFound = 'Query letter not found',
  NoQueryFound = 'No query letters found',
  UnableToExportQueries = 'Unable to export query letters',

  // -------------------------
  // HR: SUSPENSIONS
  // -------------------------
  SuspensionIssued = 'Suspension issued successfully.',
  SuspensionIssuedBody = 'A suspension action has been issued to you. Please contact HR for further details.', // email body

  SuspensionUpdated = 'Suspension updated successfully.',
  SuspensionUpdatedBody = 'Your suspension record has been updated by HR.', // email body

  SuspensionRevoked = 'Suspension revoked successfully.',
  SuspensionRevokedBody = 'Your suspension has been revoked. You may resume duties as instructed.', // email body

  SuspensionCompleted = 'Suspension completed successfully.',
  SuspensionCompletedBody = 'Your suspension period has been completed.', // email body

  SuspensionDeleted = 'Suspension record deleted successfully.',
  SuspensionNotFound = 'Suspension record not found',
  NoSuspensionFound = 'No suspension records found',
  UnableToExportSuspensions = 'Unable to export suspension records',
  PlotNotFound = 'The specified plot could not be found.',
  OfferNotFound = 'The requested offer does not exist.',
  TargetUserRequired = 'A target user is required to perform this operation.',
  InvalidTarget = 'The specified target is invalid or not supported.',
  NoOfferFound = 'No offers were found.',
  DiscountOfferAlreadyExistOnThisProperty = 'A discount offer already exists on this property.',
  DiscountOfferNotAvailable = 'The requested discount offer is not available.',
  DiscountOfferNotFound = 'The specified discount offer could not be found.',
  NoDiscountOffersFound = 'No discount offers were found.',
  UnableToOfferPendingSale = "UnableToOfferPendingSale",
}
