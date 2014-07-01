<?php
define ( 'MESSAGE_BATCH_PER_RUN', 100000 );
define ( 'DB_USERNAME', '' );
define ( 'DB_PASSWORD', '' );
define ( 'DB_HOST', 'localhost' );
define ( 'DB_NAME', 'uforia' );

// DO NOT EDIT ANYTHING BEYOND THIS LINE
// Create database connection.
$dbh = mysql_connect ( DB_HOST, DB_USERNAME, DB_PASSWORD ) or die ( "Unable to connect to MySQL." );
// Select database by name.
$selected = mysql_select_db ( DB_NAME, $dbh ) or die ( "Could not open the MySQL database." );

$startTime = microtime ( true );

// Count total messages in database.
$sql = "
        SELECT COUNT(`application_zip_zipfilerecursor`.`hashid`) AS `message_count`
        FROM `application_zip_zipfilerecursor`
";
$result = mysql_query ( $sql );
$sql_result = mysql_fetch_array ( $result );
$total_messages = $sql_result ['message_count'];
mysql_free_result ( $result );
unset ( $sql_result, $result, $sql );

$message_iterator = 0;
for($message_offset = 0; $message_offset < $total_messages; $message_offset += MESSAGE_BATCH_PER_RUN) {
        echo "############## \n";
        echo "OFFSET: " . $message_offset . "\n";
        echo "LIMIT: " . MESSAGE_BATCH_PER_RUN . "\n";

        $sql = "
                SELECT `hashid`, `file_names`, `total_files`, `zip_stored`, `zip_deflated`, `debug`, `comment`, `contentInfo`
                FROM `application_zip_zipfilerecursor`
                ORDER BY `hashid` ASC";
                //LIMIT " . ( int ) $message_offset . "," . ( int ) MESSAGE_BATCH_PER_RUN . "";
        $msc = microtime ( true );
        $result = mysql_query ( $sql ) or die ( "Error in query: $query. " . mysql_error () );
        $msc = microtime ( true ) - $msc;
        echo ($msc * 1000) . " milliseconds \n"; // in milliseconds

        $msc_while = microtime ( true );

        while ( $fetched_result = mysql_fetch_array ( $result, MYSQL_ASSOC ) ) {
                // Set message id
                $message_iterator ++;

                // Create data object
                $data_string = json_encode ( array (
                                "files_names" => $fetched_result ['file_names'],
                                "total_files" => $fetched_result ['total_files'],
                               "zip_stored" => $fetched_result ['zip_stored'],
                                "zip_deflated" => $fetched_result ['zip_deflated'],
                                "debug" => $fetched_result ['debug'],
                                "comment" => $fetched_result ['comment'],
                                "contentInfo" => $fetched_result ['contentInfo']
                ) );

                $ch = curl_init ( 'http://localhost:9200/uforia/zip/' . $message_iterator );
                curl_setopt ( $ch, CURLOPT_CUSTOMREQUEST, "POST" );
                curl_setopt ( $ch, CURLOPT_POSTFIELDS, $data_string );
                curl_setopt ( $ch, CURLOPT_RETURNTRANSFER, true );
                curl_setopt ( $ch, CURLOPT_HTTPHEADER, array (
                                'Content-Type: application/json',
                                'Content-Length: ' . strlen ( $data_string )
                ) );
                $curl_result = curl_exec ( $ch );
                curl_close ( $ch );

                echo $message_iterator . "\n";
                echo $curl_result;
                echo "\n\n";
                //unset ( $ch, $curl_result, $data_string, $receivers, $sender, $sqlSender, $sqlReceiver );

                usleep ( 100 );
        }
        $msc_while = microtime ( true ) - $msc_while;
        echo "While takes: " . ($msc_while * 1000) . " milliseconds \n\n";
        mysql_free_result ( $result );
        unset ( $data, $result, $sql, $msc, $msc_while );

        usleep ( 5000000 );
}

echo "######################################################################### \n";
echo "TOTAL MESSAGES: " . $total_messages . "\n";
echo "DONE IN " . (microtime ( true ) - $startTime) . " SECONDS \n\n";
echo "#########################################################################";
mysql_close ( $dbh );
unset ( $startTime, $total_messages, $selected, $dbh );

?>
