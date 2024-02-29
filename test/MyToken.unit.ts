import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, util } from "chai";
import {
  BigNumber,
  Contract,
  ContractReceipt,
  ContractTransaction,
} from "ethers";
import { ethers } from "hardhat";
import { MyToken } from "../typechain";

const DECIMALS = 18;
const NAME = "MyToken";
const SYMBOL = "MTK";
const INITIAL_AMOUNT = ethers.utils.parseUnits("10", "18"); // 10^18
// const bigNumberExample = BigNumber.from(1000);

describe("My token contract Test", function () {
  let MyToken;
  let myToken: Contract;
  let owner: SignerWithAddress, user1: SignerWithAddress, user2: SignerWithAddress, users:SignerWithAddress[];

  beforeEach(async () => {
    MyToken = await ethers.getContractFactory("MyToken");
    [owner, user1, user2, ...users] = await ethers.getSigners();
    myToken = await MyToken.deploy(NAME, SYMBOL);
  });
  
  describe("Initial statement",async () => { 
    it("should return owner address",async () => {
      console.log(`address ${await myToken.owner()}`);
      expect(await myToken.owner()).to.be.equal(owner.address);
    });
    it("should have the correct name",async () => {
      const tName: String = await myToken.name();
      expect(tName).to.be.equal(NAME);
    });
    it("should have correct symbol",async () => {
      const tSybmol: String = await myToken.symbol();
      expect(tSybmol).to.be.equal(SYMBOL);
    });
    it("should have correct initial amount",async () => {
      const supply: BigNumber = await myToken.totalSupply();
      expect(supply).to.be.equal(INITIAL_AMOUNT);
    });
    it("should have correct decimals",async () => {
      const decimals: Number = await myToken.decimals();
      expect(decimals).to.be.equal(DECIMALS);
    });
  });
  describe("Check functionality",async () => {
    it("should mint correct amount",async () => {
      const amount: Number = 1000;
      await myToken.mint(user1.address, amount);
      const balance: Number = await myToken.balanceOf(user1.address);
      expect(balance).to.be.equal(amount);
    });
    it("burn check",async () => {
      const amount = 1000;
      await myToken.mint(user2.address, amount);
      await myToken.burn(user2.address, amount);
      expect(await myToken.balanceOf(user2.address)).to.be.equal(0);
    });
    describe("Transfer and allowance logic",async () => {
      it("should transfer from owner to account",async () => {
        const amount = 1000;
        await myToken.transfer(user1.address, amount);
        expect(await myToken.balanceOf(user1.address)).to.be.equal(amount);
      });
      it("should provide allowance (owner to any)",async () => {
        const amount = 1000;
        await myToken.approve(user1.address, amount);
        expect(await myToken.allowance(owner.address,user1.address)).to.be.equal(amount);
      });
      it("should provide allowance (user to any)",async () => {
        const amount = 1000;
        await myToken.connect(user1).approve(user2.address, amount);
        expect(await myToken.allowance(user1.address, user2.address)).to.be.equal(amount);
      });
      it("should transfer from approved account to any account",async () => {
        const amount = 1000;
        await myToken.mint(user1.address,amount);
        await myToken.connect(user1).approve(user2.address, amount);
        await myToken.connect(user2).transferFrom(user1.address,user2.address,amount);
        expect(await myToken.balanceOf(user2.address)).to.be.equal(amount);
      });
      it("should increase allowance",async () => {
        const amount = 1000;
        await myToken.mint(user1.address,amount);
        await myToken.connect(user1).approve(user2.address, amount);
        await myToken.connect(user1).increaseAllowance(user2.address,amount);
        expect(await myToken.allowance(user1.address, user2.address)).to.be.equal(amount*2);
      });
      it("should decrease allowance",async () => {
        const amount = 1000;
        await myToken.mint(user1.address,amount);
        await myToken.connect(user1).approve(user2.address, amount);
        await myToken.connect(user1).decreaseAllowance(user2.address,amount);
        expect(await myToken.balanceOf(user2.address)).to.be.equal(0);
      });
    });
  });
  describe("Events check",async () => {
    it("should emit Transfer event",async () => {
      const amount = 1000;
      //await myToken.transfer(user1.address, amount);
      await expect( await myToken.transfer(user1.address,amount)).to.emit(myToken,"Transfer").withArgs(owner.address,user1.address,amount);
    });
    it("should emit Approval event",async () => {
      const amount = 1000;
      await myToken.approve(user1.address, amount);
      await expect(myToken.approve(user1.address, amount)).to.emit(myToken,"Approval").withArgs(owner.address,user1.address,amount);
    });
  });
  describe("Negative scenarios",async () => {
    it("shouldn't burn more than balance",async () => {
      const amount = 1000;
      await expect(myToken.burn(user2.address, amount)).to.be.revertedWith('MyToken: Insufficient balance');
    });
    it("shouldn't mint for not an owner",async () => {
      const amount = 1000;
      await expect(myToken.connect(user1).mint(user1.address,amount)).to.be.revertedWith('MyToken: you are not an owner');
    });
    it("shouldn't burn for not an owner",async () => {
      const amount = 1000;
      await expect(myToken.connect(user1).burn(user1.address,amount)).to.be.revertedWith('MyToken: you are not an owner');
    });
    it("doesn't allow an unnaproved member to do transfers", async () => {
      const amount = 1000;
      await myToken.mint(user1.address,amount);
      await expect(
          myToken.transferFrom(user1.address, user2.address, amount)
      ).to.be.revertedWith('MyToken: Insufficient allowance');
    });
    it("won't allow a user to approve to zero address", async () => {
      const amount = 1000;
      
      await expect(
        myToken.approve( 
          ethers.constants.AddressZero,amount
          )
      ).to.be.revertedWith('MyToken: Approve to the zero address');     
    });
    it("won't allow a user to go over the allowance", async () => {
      const amount = 1000;
      await myToken.connect(user1).approve(user2.address, amount);
      
      await expect(
        myToken.transferFrom(
              user1.address,
              user2.address,
              (40 * amount).toString()
          )
      ).to.be.revertedWith('MyToken: Insufficient balance');     
    });
    it("won't allow a user to increase allowance to zero address", async () => {
      const amount = 1000;
      
      await expect(
        myToken.increaseAllowance( 
          ethers.constants.AddressZero,amount
          )
      ).to.be.revertedWith('MyToken: Approve to the zero address');     
    });
    it("won't allow a user to decrease allowance to zero address", async () => {
      const amount = 1000;

      await expect(
        myToken.decreaseAllowance(ethers.constants.AddressZero,amount)
      ).to.be.revertedWith('MyToken: Decrease allowance for the zero address');
    });
    it("should revert when transferring more tokens than the user has", async () => {
      await expect(
        myToken.connect(user1).transfer(user2.address, ethers.utils.parseUnits("10", "18"))
      ).to.be.revertedWith('MyToken: Not enough balance');
    });
    it("should revert when decreasing below zero", async () => {

      const amount = 1000;
      await myToken.connect(user1).approve(user2.address, amount);
      await expect(
        myToken.connect(user1).decreaseAllowance( 
          user2.address,amount*2
          )
      ).to.be.revertedWith('MyToken: Allowance cannot be decreased below zero');    
    });
  });
  describe("Edge cases", function () {
    it("should transfer the minimum amount", async () => {
      const amount = 1;
      await myToken.transfer(user1.address, amount);
      expect(await myToken.balanceOf(user1.address)).to.be.equal(amount);
    });
    it("should approve the maximum amount", async () => {
      const maxAmount = ethers.constants.MaxUint256;
      await myToken.approve(user1.address, maxAmount);
      expect(await myToken.allowance(owner.address,user1.address)).to.be.equal(maxAmount);
    });
  });
});
