import { By as by } from 'selenium-webdriver';
import BaseContainer from '../../base-container';

import * as driverHelper from '../../driver-helper';

export default class WPAdminUpdatesPage extends BaseContainer {
	constructor( driver ) {
		super( driver, by.css( '.update-php' ) );
	}

	activatePlugin() {
		const self = this;
		const activateButtonSelector = by.linkText( 'Activate Plugin' );
		return driverHelper.isElementPresent( this.driver, activateButtonSelector ).then( ( located ) => {
			if ( located === true ) {
				return driverHelper.clickWhenClickable( self.driver, activateButtonSelector );
			}
		} );
	}
}
