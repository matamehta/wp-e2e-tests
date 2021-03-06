import assert from 'assert';
import test from 'selenium-webdriver/testing';
import { get } from 'lodash';

import config from 'config';
import * as driverManager from '../lib/driver-manager.js';
import * as dataHelper from '../lib/data-helper';
import * as eyesHelper from '../lib/eyes-helper';

import EmailClient from '../lib/email-client.js';
import ReaderPage from '../lib/pages/reader-page';
import ProfilePage from '../lib/pages/profile-page';
import WPHomePage from '../lib/pages/wp-home-page';
import MagicLoginPage from '../lib/pages/magic-login-page';

import NavbarComponent from '../lib/components/navbar-component.js';
import LoggedOutMasterbarComponent from '../lib/components/logged-out-masterbar-component';

import LoginFlow from '../lib/flows/login-flow.js';

const mochaTimeOut = config.get( 'mochaTimeoutMS' );
const startBrowserTimeoutMS = config.get( 'startBrowserTimeoutMS' );
const screenSize = driverManager.currentScreenSize();
const host = dataHelper.getJetpackHost();

var driver;

let eyes = eyesHelper.eyesSetup( true );

test.before( function() {
	this.timeout( startBrowserTimeoutMS );
	driver = driverManager.startBrowser();
} );

test.describe( `[${host}] Authentication: (${screenSize}) @parallel @jetpack @visdiff`, function() {
	this.timeout( mochaTimeOut );
	this.bailSuite( true );

	test.before( function() {
		driverManager.clearCookiesAndDeleteLocalStorage( driver );
	} );

	test.before( function() {
		let testEnvironment = 'WordPress.com';
		let testName = `Log In and Out [${global.browserName}] [${screenSize}]`;
		eyesHelper.eyesOpen( driver, eyes, testEnvironment, testName );
	} );

	test.describe( 'Logging In and Out:', function() {
		test.describe( 'Can Log In', function() {
			test.it( 'Can log in', function() {
				let loginFlow = new LoginFlow( driver );
				loginFlow.login( { screenshot: true }, eyes );
			} );

			test.it( 'Can see Reader Page after logging in', function() {
				let readerPage = new ReaderPage( driver );
				readerPage.displayed().then( function( displayed ) {
					assert.equal( displayed, true, 'The reader page is not displayed after log in' );
				} );
			} );
		} );

		// Test Jetpack SSO
		if ( host !== 'WPCOM' ) {
			test.describe( 'Can Log via Jetpack SSO', function() {
				test.it( 'Can log into site via Jetpack SSO', () => {
					let loginFlow = new LoginFlow( driver );
					return loginFlow.login( { jetpackSSO: true } );
				} );

				test.it( 'Can return to Reader', () => {
					let readerPage = new ReaderPage( driver, true );
					return readerPage.displayed();
				} );
			} );
		}

		test.describe( 'Can Log Out', function() {
			test.it( 'Can view profile to log out', function() {
				let navbarComponent = new NavbarComponent( driver );
				navbarComponent.clickProfileLink();
			} );

			test.it( 'Can logout from profile page', function() {
				let profilePage = new ProfilePage( driver );
				eyesHelper.eyesScreenshot( driver, eyes, 'Me Profile Page' );
				profilePage.clickSignOut();
			} );

			test.it( 'Can see wordpress.com home when after logging out', function() {
				const loggedOutMasterbarComponent = new LoggedOutMasterbarComponent( driver );
				loggedOutMasterbarComponent.displayed().then( ( displayed ) => {
					assert( displayed, 'The logged out masterbar isn\'t displayed after logging out' );
				} );
			} );
		} );
	} );

	test.after( function() {
		eyesHelper.eyesClose( eyes );
	} );

	if ( dataHelper.hasAccountWithFeatures( 'passwordless' ) ) {
		test.describe( 'Can Log in on a passwordless account', function() {
			test.describe( 'Can request a magic link email by entering the email of an account which does not have a password defined', function() {
				let magicLoginLink, loginFlow, magicLinkEmail, emailClient;
				test.before( function() {
					loginFlow = new LoginFlow( driver, [ 'passwordless' ] );
					emailClient = new EmailClient( get( loginFlow.account, 'mailosaur.inboxId' ) );
					return loginFlow.login();
				} );

				test.it( 'Can find the magic link in the email received', function() {
					return emailClient.pollEmailsByRecipient( loginFlow.account.email ).then( function( emails ) {
						magicLinkEmail = emails.find( email => email.subject.indexOf( 'WordPress.com' ) > -1 );
						assert( magicLinkEmail !== undefined, 'Could not find the magic login email' );
						magicLoginLink = magicLinkEmail.html.links[0].href;
						assert( magicLoginLink !== undefined, 'Could not locate the magic login link in the email' );
						return true;
					} );
				} );

				test.describe( 'Can use the magic link to log in', function() {
					let magicLoginPage;
					test.it( 'Visit the magic link and we\'re logged in', function() {
						driver.get( magicLoginLink );
						magicLoginPage = new MagicLoginPage( driver );
						magicLoginPage.finishLogin();
						let readerPage = new ReaderPage( driver );
						return readerPage.displayed().then( function( displayed ) {
							return assert.equal( displayed, true, 'The reader page is not displayed after log in' );
						} );
					} );

					// we should always remove a magic link email once the magic link has been used (even if login failed)
					test.after( function() {
						if ( magicLinkEmail ) {
							return emailClient.deleteAllEmailByID( magicLinkEmail.id );
						}
					} );
				} );

				test.after( function() {
					if ( loginFlow ) {
						loginFlow.end();
					}
				} );
			} );
		} );
	}
} );

test.describe( `[${host}] User Agent: (${screenSize}) @parallel @jetpack`, function() {
	this.timeout( mochaTimeOut );
	this.bailSuite( true );

	test.before( function() {
		driverManager.clearCookiesAndDeleteLocalStorage( driver );
	} );

	test.it( 'Can see the correct user agent set', function() {
		this.wpHomePage = new WPHomePage( driver, { visit: true } );
		driver.executeScript( 'return navigator.userAgent;' ).then( ( userAgent ) => {
			assert( userAgent.match( 'wp-e2e-tests' ), `User Agent does not contain 'wp-e2e-tests'.  [${userAgent}]` );
		} );
	} );
} );
