import Array "mo:base/Array";
import Debug "mo:base/Debug";
import Iter "mo:base/Iter";
import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Timer "mo:base/Timer";
import Error "mo:base/Error";
import Blob "mo:base/Blob";
import Nat64 "mo:base/Nat64"; // 添加 Nat64 导入
import Int32 "mo:base/Int32"; // 添加 Int32 导入

import Result "mo:base/Result";

actor MyCanister{
  type Account = { owner : Principal; subaccount : ?[Nat8] };
  type BalanceResult = { balance : Nat; timestamp : Time.Time };
  type MessageResult = { userName : Text; message : Text; timestamp : Time.Time };

  type CircularBuffer = { var buffer : [var BalanceResult]; var head : Nat; var count : Nat };
  type MessageCircularBuffer = { var buffer : [var MessageResult]; var head : Nat; var count : Nat };

  let BUFFER_SIZE : Nat = 2880;
  let TEST_BUFFER_SIZE : Nat = 999;

  stable var dailyBuffer : CircularBuffer = {
    var buffer = Array.init<BalanceResult>(BUFFER_SIZE, { balance = 0; timestamp = 0 });
    var head = 0;
    var count = 0;
  };
  stable var weeklyBuffer : CircularBuffer = {
    var buffer = Array.init<BalanceResult>(BUFFER_SIZE, { balance = 0; timestamp = 0 });
    var head = 0;
    var count = 0;
  };
  stable var monthlyBuffer : CircularBuffer = {
    var buffer = Array.init<BalanceResult>(BUFFER_SIZE, { balance = 0; timestamp = 0 });
    var head = 0;
    var count = 0;
  };
  stable var yearlyBuffer : CircularBuffer = {
    var buffer = Array.init<BalanceResult>(BUFFER_SIZE, { balance = 0; timestamp = 0 });
    var head = 0;
    var count = 0;
  };
  stable var decadeBuffer : CircularBuffer = {
    var buffer = Array.init<BalanceResult>(BUFFER_SIZE, { balance = 0; timestamp = 0 });
    var head = 0;
    var count = 0;
  };

  stable var messageBuffer : MessageCircularBuffer = {
    var buffer = Array.init<MessageResult>(TEST_BUFFER_SIZE, { userName = ""; message = ""; timestamp = 0 });
    var head = 0;
    var count = 0;
  };

  let ledgerCanister : actor { icrc1_balance_of : shared query Account -> async Nat } = 
    actor("mxzaz-hqaaa-aaaar-qaada-cai");

  var latestBalance : Nat = 0;
  var latestTimestamp : Time.Time = 0;
  var timerId : ?Timer.TimerId = null;
  var lastWeeklyUpdate : Time.Time = 0;
  var lastMonthlyUpdate : Time.Time = 0;
  var lastYearlyUpdate : Time.Time = 0;
  var lastDecadeUpdate : Time.Time = 0;

  private func add(buffer : CircularBuffer, element : BalanceResult) : () {
    let writeIndex = buffer.head % BUFFER_SIZE;
    buffer.buffer[writeIndex] := element;
    if (buffer.count < BUFFER_SIZE) {
      buffer.count := buffer.count + 1;
    };
    buffer.head := (buffer.head + 1) % BUFFER_SIZE;
    Debug.print("Added to buffer: balance=" # debug_show(element.balance) # " timestamp=" # debug_show(element.timestamp) # " at index: " # debug_show(writeIndex));
  };

  // private func addMessage(element : MessageResult) : () {
  //   let writeIndex = messageBuffer.head % TEST_BUFFER_SIZE;
  //   messageBuffer.buffer[writeIndex] := element;
  //   if (messageBuffer.count < TEST_BUFFER_SIZE) {
  //     messageBuffer.count := messageBuffer.count + 1;
  //   };
  //   messageBuffer.head := (messageBuffer.head + 1) % TEST_BUFFER_SIZE;
  //   Debug.print("Added message: userName=" # element.userName # " message=" # element.message # " at index: " # debug_show(writeIndex));
  // };
  private func addMessage(element : MessageResult) : Result.Result<(), Text> {
  let writeIndex = messageBuffer.head % TEST_BUFFER_SIZE;
  messageBuffer.buffer[writeIndex] := element;
  if (messageBuffer.count < TEST_BUFFER_SIZE) {
    messageBuffer.count := messageBuffer.count + 1;
  };
  messageBuffer.head := (messageBuffer.head + 1) % TEST_BUFFER_SIZE;
  Debug.print("Added message: userName=" # element.userName # " message=" # element.message # " at index: " # debug_show(writeIndex));
  #ok(()) // 返回成功状态
  };
  private func updateBalance() : async () {
    let account : Account = {
      owner = Principal.fromText("ztwhb-qiaaa-aaaaj-azw7a-cai");
      subaccount = null;
    };
    try {
      let balance = await ledgerCanister.icrc1_balance_of(account);
      let timestamp = Time.now();
      latestBalance := balance;
      latestTimestamp := timestamp;
      add(dailyBuffer, { balance; timestamp });
      if (timestamp - lastWeeklyUpdate >= 210_000_000_000) {
        add(weeklyBuffer, { balance; timestamp });
        lastWeeklyUpdate := timestamp;
      };
      if (timestamp - lastMonthlyUpdate >= 840_000_000_000) {
        add(monthlyBuffer, { balance; timestamp });
        lastMonthlyUpdate := timestamp;
      };
      if (timestamp - lastYearlyUpdate >= 10_080_000_000_000) {
        add(yearlyBuffer, { balance; timestamp });
        lastYearlyUpdate := timestamp;
      };
      if (timestamp - lastDecadeUpdate >= 100_800_000_000_000) {
        add(decadeBuffer, { balance; timestamp });
        lastDecadeUpdate := timestamp;
      };
      Debug.print("Balance: " # debug_show(balance) # " at " # debug_show(timestamp));
    } catch (e) {
      Debug.print("Error updating balance: " # Error.message(e));
    };
  };

  public func initTimer() : async () {
    switch (timerId) {
      case (?id) { Timer.cancelTimer(id); };
      case null {};
    };
    let newTimerId = Timer.recurringTimer<system>(#seconds(30), updateBalance);
    timerId := ?newTimerId;
  };

  private func getBufferData(buffer : CircularBuffer) : [BalanceResult] {
    if (buffer.count == 0) {
      return [];
    };
    let size = if (buffer.count < BUFFER_SIZE) buffer.count else BUFFER_SIZE;
    Array.tabulate<BalanceResult>(size, func(i : Nat) : BalanceResult {
      let startIndex = if (buffer.count < BUFFER_SIZE) 0 else buffer.head;
      let index = (startIndex + i) % BUFFER_SIZE;
      buffer.buffer[index]
    })
  };

  private func getMessageBufferData() : [MessageResult] {
    if (messageBuffer.count == 0) {
      return [];
    };
    let size = if (messageBuffer.count < TEST_BUFFER_SIZE) messageBuffer.count else TEST_BUFFER_SIZE;
    Array.tabulate<MessageResult>(size, func(i : Nat) : MessageResult {
      let startIndex = if (messageBuffer.count < TEST_BUFFER_SIZE) 0 else messageBuffer.head;
      let index = (startIndex + i) % TEST_BUFFER_SIZE;
      messageBuffer.buffer[index]
    })
  };

  public query func getDailyBuffer() : async [BalanceResult] {
    getBufferData(dailyBuffer)
  };
  public query func getWeeklyBuffer() : async [BalanceResult] {
    getBufferData(weeklyBuffer)
  };
  public query func getMonthlyBuffer() : async [BalanceResult] {
    getBufferData(monthlyBuffer)
  };
  public query func getYearlyBuffer() : async [BalanceResult] {
    getBufferData(yearlyBuffer)
  };
  public query func getDecadeBuffer() : async [BalanceResult] {
    getBufferData(decadeBuffer)
  };

  public query func getMessageBuffer() : async [MessageResult] {
    getMessageBufferData()
  };

  public query func getCount(bufferType : Text) : async Nat {
    switch (bufferType) {
      case ("daily") { dailyBuffer.count };
      case ("weekly") { weeklyBuffer.count };
      case ("monthly") { monthlyBuffer.count };
      case ("yearly") { yearlyBuffer.count };
      case ("decade") { decadeBuffer.count };
      case ("message") { messageBuffer.count };
      case _ { 0 };
    }
  };

  public query func getBalance() : async BalanceResult {
    { balance = latestBalance; timestamp = latestTimestamp }
  };

  public query func isTimerRunning() : async Bool {
    switch (timerId) {
      case (?id) { true };
      case null { false };
    }
  };

  // public shared func addMessageToBuffer(userName : Text, message : Text) : async () {
  //   let timestamp = Time.now();
  //   let element : MessageResult = { userName; message; timestamp };
  //   addMessage(element);
  // };

  // 公开接口，供前端调用
public shared func addMessageToBuffer(userName : Text, message : Text) : async Result.Result<(), Text> {
    let timestamp = Time.now();
    let msg : MessageResult = {
      userName = userName;
      message = message;
      timestamp = timestamp;
    };
    addMessage(msg) // 直接返回 addMessage 的结果
  };
};